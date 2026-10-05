import { z } from "zod";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import {
  addMyDate,
  deleteMyDates,
  listMyDates,
  normalizeType,
  updateMyDate,
} from "../services/my-dates.service";
import type { MyDateItem } from "../services/my-dates.service";

export type { MyDateItem };

/**
 * Тіло дати — усі поля, які пишуть у рядок `my_dates`, мають бути тим, чим воно
 * потім є: `date`, `type`, `id`, `name`, `notes` — рядки, `tags` — список рядків.
 * Невідомі поля лишаються (`.passthrough()`), решту нормалізують правила сервісу.
 *
 * Старі імена (`alias`, `category`) живі в коді: клієнт міг їх надсилати ще з
 * часів JSON-у, тож це прийом старого формату, а не друга семантика.
 */
const dateBody = z
  .object({
    date: z.string().optional(),
    type: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    alias: z.string().optional(),
    category: z.string().optional(),
  })
  .passthrough();

/**
 * Канонічний формат дати — `рррр-мм-dd`: його порівнює й сортує сам SQL, тож
 * зберігати «03.03.1980» означало б другу алфавіту в одній колонці.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Теги з тіла запиту: старий `category` — це один тег. */
function readTags(tags: string[] | undefined, category: string | undefined): string[] {
  if (Array.isArray(tags)) return tags;
  return category ? [category] : [];
}

export async function handleMyDates(request: Request, env: Env): Promise<Response> {
  try {
    const identity = await resolveUserId(request, env);
    if (!identity.ok) return identity.response;
    const { userId } = identity;

    const dates = await listMyDates(env.DB, userId);

    if (request.method === "GET") {
      return json({ ok: true, dates });
    }

    if (request.method === "POST") {
      const parsed = await readBody(request, dateBody);
      if (!parsed.ok) return parsed.response;

      const { date, type, id, name, tags, notes, alias, category } = parsed.body;
      if (!date || !DATE_RE.test(date)) return json({ ok: false, error: "date is required" }, 400);

      const created = await addMyDate(env.DB, userId, {
        id: id || `mt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        date,
        type: normalizeType(type),
        name: name || alias || "",
        tags: readTags(tags, category),
        notes: notes || "",
      });

      return json({ ok: true, id: created.id });
    }

    if (request.method === "PUT") {
      const parsed = await readBody(request, dateBody);
      if (!parsed.ok) return parsed.response;

      const { id, date, type, name, tags, notes, alias, category } = parsed.body;
      if (!id) return json({ ok: false, error: "id is required" }, 400);
      if (!date || !DATE_RE.test(date)) return json({ ok: false, error: "date is required" }, 400);

      // Порожні рядки — це «стерти значення», а не «не передавати»: форма
      // присилає все поля, і спроба відрізнити їх лише довжиною змусила б
      // відправляти спеціальні маркери (AGENTS.md §7).
      const updated = await updateMyDate(env.DB, userId, id, {
        date,
        type: type === undefined ? undefined : normalizeType(type),
        name: name ?? alias,
        tags: readTags(tags, category),
        notes: notes ?? "",
      });

      if (!updated) return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true });
    }

    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      const ids = url.searchParams.get("ids");
      if (!id && !ids) return json({ ok: false, error: "id or ids required" }, 400);

      const wanted = (ids ? ids.split(",") : [id ?? ""]).filter(Boolean);
      const deleted = await deleteMyDates(env.DB, userId, wanted);
      if (deleted === 0) return json({ ok: false, error: "Not found" }, 404);

      // Число — реально видалених рядків: список на екрані оновлюється за ним.
      return json({ ok: true, deleted });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("My-dates error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: msg }, 500);
  }
}
