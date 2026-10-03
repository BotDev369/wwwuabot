/**
 * Розбір тіла запиту — єдина точка, де довіряють клієнту. Було
 * `req.json() as { … }` — перевірки не було; Zod дає тип виводом, помилка
 * → `400` без імен полів. Рецепт `docs/RECIPES.md` §1a, рішення D14.
 *
 * @module api-dev/src/shared/body
 */

import type { z } from "zod";

/** Відповідь, яку ендпоінт повертає клієнту без деталей схеми. */
export type BodyResult<T> = { ok: true; body: T } | { ok: false; response: Response };

function invalidBody(): Response {
  return new Response(JSON.stringify({ error: "Invalid body" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Прочитати й перевірити тіло запиту.
 *
 * `null` і не-об'єкт — це `400`: тіло, з яким сервіс працює далі, повинно
 * бути перевіреним, а не «ну, це вже хтось розбереться».
 */
export async function readBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<BodyResult<z.output<T>>> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return { ok: false, response: invalidBody() };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, response: invalidBody() };

  const result = schema.safeParse(parsed);
  if (!result.success) return { ok: false, response: invalidBody() };
  return { ok: true, body: result.data };
}
