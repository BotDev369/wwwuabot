/**
 * Самооцінка: прийом відповідей і читання історії.
 *
 * **Рахунок рахується тут, у сервері.** Клієнт надсилає лише номери обраних
 * варіантів, а `scoreAssessment` — одна функція на весь продукт. Тому правило
 * рахування живе в одному місці, і людина не може підробити собі «нормальний»
 * результат: бал, який прийшов у запиті, просто ігнорується, а рядки пишуться
 * заново.
 *
 * **Одне проходження — рядок на кожну шкалу.** «Тревожність і депресія» має
 * дві шкали, тож пишуться два рядки з однаковим `created_at` і різними
 * `scale_key`. Так не потрібно ані колонки з JSON, ані окремої таблиці під
 * другий бал, а історія й тренд рахуються по кожній шкалі окремо.
 *
 * **Власник стоїть у `WHERE` кожного читання.** Результат самооцінки — це
 * найчутливіше, що є про людину в базі, тому умова не виноситься в окрему
 * перевірку: її легко забути на новому шляху, а `WHERE owner_id = ?` — ні.
 *
 * @module api-dev/src/services/assessments.service
 */

import {
  getAssessment,
  safetyOf,
  scoreAssessment,
  validateAnswers,
  type AssessmentRecord,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";

const COLUMNS =
  "id, test_key, scale_key, answers, raw, percent, band_key, needs_attention, created_at";

/** Рядок бази — звірка з `assessment_results` у `database/tables.ts`. */
interface ResultRow {
  id: number;
  test_key: string;
  scale_key: string | null;
  answers: string | null;
  raw: number | null;
  percent: number | null;
  band_key: string | null;
  needs_attention: number | null;
  created_at: string | null;
}

/**
 * Відповіді з бази — **лише цілі числа в межах шкали**.
 *
 * JSON у базі не довіряємо: рядок міг бути записаний іншим кодом або руками.
 * Те, що не число, відкидається, а не перетворюється на `NaN`, бо `NaN` у
 * результаті читається як «людина відповіла дивним чином», а не як пошкоджений
 * рядок.
 */
function parseAnswers(raw: string | null): number[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (answer): answer is number => typeof answer === "number" && Number.isInteger(answer),
  );
}

function toRecord(row: ResultRow): AssessmentRecord {
  return {
    id: row.id,
    testKey: row.test_key,
    scaleKey: row.scale_key ?? "",
    answers: parseAnswers(row.answers),
    raw: row.raw ?? 0,
    percent: row.percent ?? 0,
    bandKey: row.band_key ?? "",
    needsAttention: (row.needs_attention ?? 0) === 1,
    createdAt: row.created_at ?? "",
  };
}

/** Тест, який реально існує. Ключ із запиту не віримо — беремо з реєстру. */
export function findTest(key: string): AssessmentTest | null {
  return getAssessment(key);
}

export type SaveOutcome =
  | { readonly ok: true; readonly records: AssessmentRecord[] }
  | { readonly ok: false; readonly error: string };

/**
 * Приймає проходження: перевіряє відповідь **спільним правилом** і рахує бал
 * тим самим правилом, яке читає клієнт. Тому сервер і браузер не можуть
 * розійтися в тому, що бачить людина.
 *
 * **Рядок на кожну шкалу, дата одна на все проходження.** Два рядки двох шкал —
 * це **один замір**, тож історія має показувати його як одну подію, а не дві
 * різні; різнить їх лише `scale_key`.
 *
 * Прапор безпеки **піднімає** `needs_attention`, а не замінює його: 1 бал із 27
 * залишається «мінімальними симптомами» у смузі, але вже не «нічого страшного».
 * Рядок у базі мусить говорити правду про обидва.
 */
export async function saveAssessment(
  db: D1Database,
  ownerId: string,
  testKey: string,
  answers: unknown,
): Promise<SaveOutcome> {
  const test = findTest(testKey);
  if (!test) return { ok: false, error: "Тест не знайдено" };
  if (!Array.isArray(answers)) return { ok: false, error: "Відповіді мають бути масивом" };

  const problem = validateAnswers(test, answers as number[]);
  if (problem) return { ok: false, error: problem };

  const result = scoreAssessment(test, answers as number[]);
  const attention = result.needsAttention || safetyOf(test, answers as number[]).triggered ? 1 : 0;
  const createdAt = formatSqliteDatetime();

  const insert = db.prepare(
    `INSERT INTO assessment_results
       (owner_id, test_key, scale_key, answers, raw, percent, band_key, needs_attention, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const batch = test.scales.map((one) =>
    insert.bind(
      ownerId,
      test.key,
      one.key,
      JSON.stringify(answers),
      result.scales.find((scored) => scored.scale.key === one.key)?.raw ?? 0,
      result.scales.find((scored) => scored.scale.key === one.key)?.percent ?? 0,
      result.scales.find((scored) => scored.scale.key === one.key)?.band.key ?? "",
      attention,
      createdAt,
    ),
  );
  await db.batch(batch);

  // Читаємо рядки назад, а не збираємо відповідь із того, що маємо в памʼяті:
  // `created_at` має бути те саме, що лежить у базі, а не «майже те саме».
  const keys = test.scales.map((one) => one.key).join(", ");
  const rows = await db
    .prepare(
      `SELECT ${COLUMNS} FROM assessment_results
       WHERE owner_id = ? AND test_key = ? AND created_at = ? AND scale_key IN (${keys})
       ORDER BY id`,
    )
    .bind(ownerId, test.key, createdAt)
    .all<ResultRow>();
  if (!rows.results || rows.results.length !== test.scales.length) {
    return { ok: false, error: "Результат не записано" };
  }
  return { ok: true, records: rows.results.map(toRecord) };
}

/**
 * Історія людини, новіші спершу.
 *
 * `testKey` порожній — усі тести. Фільтр стоїть у `WHERE`, а не після
 * вибірки в памʼяті: інакше список віддавав би результати іншого тесту.
 */
export async function listAssessments(
  db: D1Database,
  ownerId: string,
  testKey?: string,
  limit = 60,
): Promise<AssessmentRecord[]> {
  const query =
    `SELECT ${COLUMNS} FROM assessment_results WHERE owner_id = ?` +
    (testKey ? " AND test_key = ?" : "") +
    " ORDER BY created_at DESC, id DESC LIMIT ?";
  const statement = testKey
    ? db.prepare(query).bind(ownerId, testKey, limit)
    : db.prepare(query).bind(ownerId, limit);
  const result = await statement.all<ResultRow>();
  return (result.results ?? []).map(toRecord);
}
