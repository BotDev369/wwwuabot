/**
 * Реєстр систем аналізу — з `analysis_systems`: «яка система є, як її звати,
 * які в неї параметри» — **дані**, тож додати систему не означає правку коду.
 * У коді лишається **розрахунок** (`SYSTEM_CALCULATORS`), а `implemented` — не
 * «готово», а «є формула»: систему можна завести раніше, ніж з'явиться її
 * розрахунок.
 * @module api-dev/src/services/analysis-systems.service
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";

export interface AnalysisSystem {
  id: string;
  name: string;
  description: string;
  parameters: Array<{ key: string; label: string }>;
  /** `false` — систему описано, але розрахунку ще немає. */
  implemented: boolean;
  isActive: boolean;
}

interface SystemRow {
  id: string;
  name: string;
  description: string | null;
  parameters: string | null;
  implemented: number | null;
  is_active: number | null;
}

/**
 * Параметри з JSON-колонки — завжди масив об'єктів `{key,label}`.
 *
 * Розбитий JSON або не масив не повинні лишати систему без параметрів і без
 * читача: система з'явиться у виборі порожньою, і це краще, ніж падіння.
 */
function parseParameters(raw: string | null): Array<{ key: string; label: string }> {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { key: string; label?: string } => isParameter(item))
      .map((item) => ({ key: item.key, label: item.label ?? item.key }));
  } catch {
    return [];
  }
}

function isParameter(value: unknown): value is { key: string; label?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { key?: unknown }).key === "string"
  );
}

function toSystem(row: SystemRow): AnalysisSystem {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    parameters: parseParameters(row.parameters),
    implemented: Number(row.implemented ?? 0) === 1,
    isActive: Number(row.is_active ?? 1) === 1,
  };
}

/** Реєстр у порядку показу; вимкнені системи прибираються (`is_active = 0`). */
export async function listAnalysisSystems(db: D1Database): Promise<AnalysisSystem[]> {
  await ensureTables(db, ["analysis_systems"]);

  const result = await db
    .prepare(
      `SELECT id, name, description, parameters, implemented, is_active
         FROM analysis_systems
        WHERE COALESCE(is_active, 1) = 1
        ORDER BY position, id`,
    )
    .all<SystemRow>();

  return (result.results ?? []).map(toSystem);
}

/** Ті системи, для яких у коді є формула: саме їх рахує `/analyze` і `/compare`. */
export async function listImplementedSystems(db: D1Database): Promise<AnalysisSystem[]> {
  const systems = await listAnalysisSystems(db);
  return systems.filter((system) => system.implemented);
}
