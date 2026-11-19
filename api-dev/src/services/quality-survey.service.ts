/**
 * Останнє проходження «Великої п'ятірки» → свідчення ядра.
 * «Останнє» — це п'ять рядків з одним `created_at`, а не п'ять останніх рядків:
 * інакше рівень стане сумішшю двох різних людей. Рівень береться зі смуги
 * фактора, а не з відсотка (друга шкала розійшлася б із першою). Порогу уваги
 * в рис немає — `attentionRaw` не заданий.
 * @module api-dev/src/services/quality-survey.service
 */

import {
  bandOf,
  getAssessment,
  maxRawScore,
  type AssessmentScale,
} from "@wwwuabot/shared/assessments";
import type { MeasuredFactor, QualityLevel } from "@wwwuabot/shared/qualities";

/** Ключ інструмента в реєстрі тестів: він же — джерело свідчень. */
const TEST_KEY = "bigfive";

/** Останній вимір людини: дата проходження й фактори з рівнями. */
export interface SurveyRead {
  readonly measuredAt: string;
  readonly factors: readonly MeasuredFactor[];
}

/** Рядок бази — звірка з `assessment_results` у `database/tables.ts`. */
interface ResultRow {
  scale_key: string | null;
  raw: number | null;
  percent: number | null;
  created_at: string | null;
}

/** Скільки рядків читаємо: п'ять шкал плюс запас на кілька проходжень. */
const LIMIT = 25;

/**
 * Рівень 1–5 зі смуги фактора. Смуги йдуть від низького до високого, тож
 * індекс смуги — це вже рівень; окремої таблиці не треба.
 */
function levelOf(scale: AssessmentScale, raw: number): QualityLevel | null {
  const band = bandOf(scale, raw);
  if (!band) return null;
  const index = scale.bands.findIndex((candidate) => candidate.key === band.key);
  return index >= 0 ? ((index + 1) as QualityLevel) : null;
}

/**
 * Останнє проходження, або `null` — людина ще не проходила інструмент.
 *
 * `factor` у свідченні — ключ шкали реєстру (`extraversion`), а не підпис:
 * ядро знає правила за ключем, а підпис — це вже мова показу.
 */
export async function latestSurvey(db: D1Database, ownerId: string): Promise<SurveyRead | null> {
  const test = getAssessment(TEST_KEY);
  if (!test) return null;

  const rows = await db
    .prepare(
      `SELECT scale_key, raw, percent, created_at FROM assessment_results
       WHERE owner_id = ? AND test_key = ?
       ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .bind(ownerId, TEST_KEY, LIMIT)
    .all<ResultRow>();

  const list = rows.results ?? [];
  const measuredAt = list[0]?.created_at ?? "";
  if (!measuredAt) return null;

  // Тільки рядки одного проходження: та сама мить запису — та сама людина.
  const run = list.filter((row) => row.created_at === measuredAt);

  const factors: MeasuredFactor[] = [];
  for (const scale of test.scales) {
    const row = run.find((candidate) => candidate.scale_key === scale.key);
    if (!row) continue;
    const raw = row.raw ?? 0;
    const level = levelOf(scale, raw);
    // Смуги покривають увесь діапазон (це стереже тест інструмента). Якщо
    // рядок усе ж поза ними — це пошкоджені дані, і фактор краще пропустити,
    // ніж показати вигаданий середній рівень.
    if (level === null) continue;
    factors.push({
      factor: scale.key,
      level,
      evidence: `${scale.title} — ${raw} з ${maxRawScore(test, scale)}`,
    });
  }

  return factors.length > 0 ? { measuredAt, factors } : null;
}
