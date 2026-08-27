import { SIGN_ORDER, SIGN_CUTOFFS, SIGN_META, DEFAULT_MYDATE_SYSTEMS } from "./constants";
import type { Env } from "./types";
import { apiLog } from "./logger";

// ── Astrology math ─────────────────────────────────────────────────

function getSunSign(month: number, day: number): string {
  const md = month * 100 + day;
  for (const c of SIGN_CUTOFFS) {
    if (md <= c.md) return c.sign;
  }
  return "Козоріг";
}

function daysSinceSignStart(
  startMonth: number,
  startDay: number,
  month: number,
  day: number,
): number {
  const ref = 2001;
  const start = Date.UTC(ref, startMonth - 1, startDay);
  let current = Date.UTC(ref, month - 1, day);
  if (current < start) current = Date.UTC(ref + 1, month - 1, day);
  return Math.round((current - start) / 86400000);
}

function getCuspInfo(sign: string, dayOffset: number): string {
  const idx = SIGN_ORDER.indexOf(sign);
  if (dayOffset <= 1) return `Можливо, межа з ${SIGN_ORDER[(idx + 11) % 12]}`;
  if (dayOffset >= 28) return `Можливо, межа з ${SIGN_ORDER[(idx + 1) % 12]}`;
  return "Ні";
}

export function calculateWesternAstrology(day: number, month: number) {
  const sign = getSunSign(month, day);
  const meta = SIGN_META[sign];
  const dayOffset = daysSinceSignStart(meta.startMonth, meta.startDay, month, day);
  const decanIndex = Math.min(2, Math.floor(dayOffset / 10));
  const decanLabel = ["1-й декан", "2-й декан", "3-й декан"][decanIndex];
  const degree = Math.min(29, Math.round((dayOffset / 30) * 29));

  return {
    parameters: [
      { key: "sunSign", label: "Знак Сонця", value: sign },
      { key: "element", label: "Стихія", value: meta.element },
      { key: "modality", label: "Якість (хрест)", value: meta.modality },
      { key: "ruler", label: "Управитель (сучасний)", value: meta.ruler },
      {
        key: "traditionalRuler",
        label: "Традиційний управитель",
        value: meta.traditionalRuler,
      },
      { key: "decan", label: "Декан", value: decanLabel },
      { key: "degree", label: "Наближений градус Сонця", value: `~${degree}°` },
      { key: "cusp", label: "Прикордонний знак", value: getCuspInfo(sign, dayOffset) },
    ],
    comingSoon: [
      "Місяць",
      "Меркурій",
      "Венера",
      "Марс",
      "Юпітер",
      "Сатурн",
      "Уран",
      "Нептун",
      "Плутон",
    ],
  };
}

// ── Registry ───────────────────────────────────────────────────────

export async function getSystemsRegistry(env: Env): Promise<any[]> {
  const raw = await env.CONTENT_KV.get("mydate:systems");
  const kvSystems: any[] = raw ? JSON.parse(raw) : [];
  const kvById = new Map(kvSystems.map((s: any) => [s.id, s]));
  const merged: any[] = DEFAULT_MYDATE_SYSTEMS.map((def) => {
    const kv = kvById.get(def.id);
    if (!kv) return def;
    const params =
      Array.isArray(kv.parameters) && kv.parameters.length ? kv.parameters : def.parameters;
    return { ...def, ...kv, parameters: params };
  });
  for (const s of kvSystems) {
    if (!DEFAULT_MYDATE_SYSTEMS.some((d) => d.id === s.id)) {
      merged.push({ ...s, parameters: Array.isArray(s.parameters) ? s.parameters : [] });
    }
  }
  return merged;
}

// ── Analysis D1 + KV cache ─────────────────────────────────────────

export async function getAnalysis(
  db: D1Database,
  kv: KVNamespace,
  date: string,
): Promise<Record<string, any>> {
  const kvKey = `mydate:analysis:${date}`;
  const cached = await kv.get(kvKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fall through to D1
    }
  }
  const row = await db
    .prepare(`SELECT systems_data FROM mydate_analysis WHERE date = ?`)
    .bind(date)
    .first();
  if (row?.systems_data) {
    try {
      const parsed = JSON.parse(row.systems_data as string);
      await kv.put(kvKey, JSON.stringify(parsed));
      return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

export async function saveAnalysis(
  db: D1Database,
  kv: KVNamespace,
  date: string,
  systemId: string,
  result: any,
): Promise<Record<string, any>> {
  const existing = await getAnalysis(db, kv, date);
  const updated = { ...existing, [systemId]: result };
  const json = JSON.stringify(updated);
  await db
    .prepare(
      `INSERT INTO mydate_analysis (date, systems_data, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(date) DO UPDATE SET systems_data = excluded.systems_data, updated_at = excluded.updated_at`,
    )
    .bind(date, json)
    .run();
  await kv.put(`mydate:analysis:${date}`, json);
  return updated;
}

/** Map of systemId → calculator function. */
export const SYSTEM_CALCULATORS: Record<string, (date: string) => any> = {
  western: (date: string) => {
    const [, month, day] = date.split("-").map((n) => parseInt(n, 10));
    return calculateWesternAstrology(day, month);
  },
};
