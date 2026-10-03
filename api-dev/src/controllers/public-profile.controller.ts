/**
 * Контролер публічного профілю: власні налаштування видимості й те, що бачить
 * Простір.
 *
 * Дві групи ендпоїнтів — і вони принципово різні:
 *
 *   POST /api/user/about       — «Про себе» (ідентичність із підписаного initData)
 *   POST /api/user/visibility  — публічний профіль і набір відкритих полів
 *   GET  /api/space/users      — люди, які самі відкрились
 *   GET  /api/space/users/:id  — профіль однієї людини, якщо вона відкрита
 *
 * `/api/space/*` — **публічні**: у стрічку Простору дивляться без входу, і
 * ціна цього — те, що фільтр видимості стоїть у запиті до бази
 * (`PublicProfileService`), а не в цьому файлі. Тут жодного поля не додають до
 * відповіді: усе, що видно, вже відібрано сервісом.
 *
 * @module api-dev/src/controllers/public-profile.controller
 */

import { z } from "zod";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { PublicProfileService } from "../services/public-profile.service";

/**
 * «Про себе» — `unknown` свідомо: текст нормалізує `saveAbout`, і його межа
 * (`ABOUT_MAX_LENGTH`) має лишатися в одному місці, а не дублюватися тут.
 */
const aboutBody = z.object({ about: z.unknown() });

/**
 * `public` — саме булеве: рядок `"false"` легко надіслати випадково, і він
 * відкрив би профіль замість закриття. `fields` нормалізують далі
 * (`parsePublicFields`), тож схема не знає переліку полів.
 */
const visibilityBody = z.object({ public: z.boolean(), fields: z.unknown().optional() });

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** POST /api/user/about — зберегти «Про себе». */
export async function handleUserAbout(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const parsed = await readBody(request, aboutBody);
  if (!parsed.ok) return parsed.response;

  const result = await new PublicProfileService(env).saveAbout(identity.userId, parsed.body.about);
  if (!result.ok) return json({ error: result.message }, 400);

  return json({ ok: true, about: result.value });
}

/** POST /api/user/visibility — відкрити або закрити профіль і вибрати поля. */
export async function handleUserVisibility(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const parsed = await readBody(request, visibilityBody);
  if (!parsed.ok) return parsed.response;

  const fields = Array.isArray(parsed.body.fields) ? parsed.body.fields.map(String) : undefined;

  try {
    const settings = await new PublicProfileService(env).saveVisibility(identity.userId, {
      isPublic: parsed.body.public,
      fields,
    });
    return json({ ok: true, ...settings });
  } catch (e: unknown) {
    apiLog.error("Visibility save error", e);
    return json({ error: "Не вдалося зберегти" }, 500);
  }
}

/** GET /api/space/users — люди, які самі відкрили свій профіль. */
export async function handleSpaceUsers(request: Request, env: Env): Promise<Response> {
  const limit = new URL(request.url).searchParams.get("limit");

  try {
    const items = await new PublicProfileService(env).listPublic(limit);
    return json({ ok: true, items });
  } catch (e: unknown) {
    apiLog.error("Space users error", e);
    return json({ error: "Не вдалося завантажити простір" }, 500);
  }
}

/**
 * GET /api/space/users/:id — профіль однієї людини.
 *
 * Закритий профіль і неіснуючий віддають **однаковий** 404: різні коди
 * сказали б, що людина в нас є, але сховалась (AGENTS.md §7).
 */
export async function handleSpaceUser(request: Request, env: Env, id: string): Promise<Response> {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return json({ error: "Некоректний профіль" }, 400);
  }

  try {
    const profile = await new PublicProfileService(env).readPublic(userId);
    if (!profile) return json({ error: "Профіль недоступний" }, 404);
    return json({ ok: true, profile });
  } catch (e: unknown) {
    apiLog.error("Space user error", e);
    return json({ error: "Не вдалося завантажити профіль" }, 500);
  }
}
