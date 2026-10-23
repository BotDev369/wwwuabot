/**
 * Дві поверхні на читання й «додати в мої»: каталог («Шаблони»), чужі відкриті
 * визначення («Публічні») і копія визначення в рядок «Моїх». Окремо від
 * `trackers.service`, бо тут **нічого не пишеться у «Мої» без явного кроку
 * людини** — саме ця межа й відрізняє поверхні (див. `docs/TRACKERS.md`).
 *
 * @module api-dev/src/services/trackers-library
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  TRACKER_CATALOG,
  catalogEntry,
  trackerCopyKey,
  trackerMode,
  trackerValueType,
  type PublicTracker,
  type Tracker,
  type TrackerCopySource,
  type TrackerFields,
  type TrackerTemplate,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { TRACKER_COLUMNS, seedGroups, toTracker, type TrackerRow } from "./trackers-seed";

/**
 * Позиція нового рядка — **у кінець** своєї групи: `MAX + 10`. Нуль (позиція
 * рядків, старших за колонку) дав би новому трекеру перше місце й стрибок
 * під палець — тому `MAX` рахуємо лише по живих сусідах.
 */
export async function nextTrackerPosition(
  env: Env,
  userId: number,
  groupId: number | null,
): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COALESCE(MAX(position), 0) + 10 AS next FROM trackers
     WHERE owner_id = ? AND group_id IS ? AND is_active = 1`,
  )
    .bind(String(userId), groupId)
    .first<{ next: number }>();
  return Number(row?.next ?? 10);
}

/**
 * «Шаблони» — сам каталог, а не рядки бази: кожен елемент плюс `added`, щоб
 * кнопка знала свій стан без другого запиту. Читання не пише нічого — саме
 * цього не робив сів, і саме тому «Мої» більше не дорівнюють каталогу.
 */
export async function listTemplates(env: Env, userId: number): Promise<TrackerTemplate[]> {
  await ensureTables(env.DB, ["trackers"]);
  const rows = await env.DB.prepare(
    `SELECT source FROM trackers
     WHERE owner_id = ? AND is_active = 1 AND source LIKE 'catalog:%'`,
  )
    .bind(String(userId))
    .all<{ source: string }>();
  const added = new Set((rows.results ?? []).map((row) => row.source));
  return TRACKER_CATALOG.map((entry) => ({
    key: entry.key,
    title: entry.title,
    unit: entry.unit,
    step: entry.step,
    goal: entry.goal,
    min: entry.min,
    max: entry.max,
    mode: entry.mode,
    icon: entry.icon,
    groupKey: entry.groupKey,
    added: added.has(`catalog:${entry.key}`),
  }));
}

/**
 * «Публічні» — опубліковані визначення **будь-чиї**, включно зі своїми
 * (своє позначається `mine`, а не зникає — інакше людина не бачить власного
 * внеску). Вимірів тут немає жодного: публічне — це форма мірки.
 *
 * Ім'я автора — `platform_username` і **лише** з відкритого профілю; порожнє
 * означає «закритий», і тоді підпису немає (див. `docs/VISIBILITY.md`).
 */
export async function listPublicTrackers(env: Env, userId: number): Promise<PublicTracker[]> {
  await ensureTables(env.DB, ["trackers"]);
  const rows = await env.DB.prepare(
    `SELECT t.id, t.owner_id, t.title, t.unit, t.step, t.goal, t.min_value, t.max_value,
            COALESCE(t.mode, CASE WHEN t.goal IS NULL THEN 'read' ELSE 'sum' END) AS mode,
            COALESCE(t.value_type, 'number') AS value_type, t.icon,
            COALESCE(u.platform_username, '') AS author
     FROM trackers t
     LEFT JOIN users u ON u.user_id = CAST(t.owner_id AS INTEGER) AND u.profile_public = 1
     WHERE t.is_public = 1 AND t.is_active = 1
     ORDER BY t.title, t.id
     LIMIT 200`,
  ).all<{
    id: number;
    owner_id: string;
    title: string;
    unit: string;
    step: number;
    goal: number | null;
    min_value: number;
    max_value: number | null;
    mode: string | null;
    value_type: string | null;
    icon: string;
    author: string;
  }>();
  return (rows.results ?? []).map((row) => ({
    id: Number(row.id),
    title: row.title,
    unit: row.unit,
    step: Number(row.step),
    goal: row.goal === null ? null : Number(row.goal),
    min: Number(row.min_value),
    max: row.max_value === null ? null : Number(row.max_value),
    mode: trackerMode({ key: "", goal: row.goal, mode: row.mode }),
    valueType: trackerValueType({ valueType: row.value_type }),
    icon: (row.icon || "bar-chart") as Tracker["icon"],
    author: row.author,
    mine: String(row.owner_id) === String(userId),
  }));
}

/**
 * «Додати в мої» — **копія**: ціль і історія мої, тож правка шаблону їх не
 * переписує. Повторне додавання воскрешає прибраний рядок з історією, а
 * `null` — джерела немає. Копія шаблону стає в **свою тематику**, а не в
 * «Свої»: інакше «додати всю групу» не дало б структури, що й у «Моїх».
 * `groups` — карта «ключ → id» для серії копій, щоб не сіяти її на кожен рядок.
 */
export async function addTrackerFrom(
  env: Env,
  userId: number,
  source: TrackerCopySource,
  groups?: Map<string, number>,
): Promise<Tracker | null> {
  const key = trackerCopyKey(source);
  const existing = await env.DB.prepare(
    `SELECT ${TRACKER_COLUMNS}, is_active FROM trackers WHERE owner_id = ? AND key = ?`,
  )
    .bind(String(userId), key)
    .first<TrackerRow & { is_active: number }>();
  if (existing) {
    const row = toTracker(existing);
    if (Number(existing.is_active) !== 1) {
      // Прибраний — повертаємо на кінець списку, а не на старе місце: людина
      // додає мірку зараз, і перше місце вона не обирала.
      await env.DB.prepare(
        `UPDATE trackers SET is_active = 1, position = ? WHERE id = ? AND owner_id = ?`,
      )
        .bind(await nextTrackerPosition(env, userId, row.groupId), row.id, String(userId))
        .run();
    }
    return row;
  }

  let fields: TrackerFields;
  let icon: string;
  let groupId: number | null = null;
  if (source.kind === "catalog") {
    const entry = catalogEntry(source.key);
    if (!entry) return null;
    const { title, unit, step, goal, min, max, mode } = entry;
    fields = { title, unit, step, goal, min, max, mode, valueType: "number" };
    icon = entry.icon;
    const themes = groups ?? (await seedGroups(env, userId));
    groupId = themes.get(entry.groupKey) ?? null;
  } else {
    const origin = await env.DB.prepare(
      `SELECT ${TRACKER_COLUMNS}, owner_id FROM trackers
       WHERE id = ? AND is_public = 1 AND is_active = 1`,
    )
      .bind(source.id)
      .first<TrackerRow & { owner_id: string }>();
    if (!origin) return null;
    // Своє ж опубліковане — не копія: рядок уже мій, і другий дав би дубль.
    if (String(origin.owner_id) === String(userId)) return toTracker(origin);
    const entry = toTracker(origin);
    fields = {
      title: entry.title,
      unit: entry.unit,
      step: entry.step,
      goal: entry.goal,
      min: entry.min,
      max: entry.max,
      mode: entry.mode,
      valueType: entry.valueType,
    };
    icon = entry.icon;
  }

  const position = await nextTrackerPosition(env, userId, groupId);
  await env.DB.prepare(
    `INSERT INTO trackers
       (owner_id, key, title, unit, step, goal, min_value, max_value, mode, value_type,
        icon, group_id, is_builtin, is_active, position, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
  )
    .bind(
      String(userId),
      key,
      fields.title,
      fields.unit,
      fields.step,
      fields.goal,
      fields.min,
      fields.max,
      fields.mode,
      fields.valueType,
      icon,
      groupId,
      source.kind === "catalog" ? 1 : 0,
      position,
      `${source.kind}:${source.kind === "catalog" ? source.key : source.id}`,
      formatSqliteDatetime(),
    )
    .run();
  const row = await env.DB.prepare(
    `SELECT ${TRACKER_COLUMNS} FROM trackers WHERE owner_id = ? AND key = ?`,
  )
    .bind(String(userId), key)
    .first<TrackerRow>();
  return row ? toTracker(row) : null;
}

/**
 * «Додати всю групу» — та сама копія для списку джерел, однією ручкою: серія
 * запитів із клієнта лишала б половину доданою при збої на середині.
 * `null` — одне з джерел не існує: відповідь та сама, що й для одного.
 */
export async function addTrackersFrom(
  env: Env,
  userId: number,
  sources: readonly TrackerCopySource[],
): Promise<Tracker[] | null> {
  const groups = await seedGroups(env, userId);
  const added: Tracker[] = [];
  for (const source of sources) {
    const tracker = await addTrackerFrom(env, userId, source, groups);
    if (!tracker) return null;
    added.push(tracker);
  }
  return added;
}
