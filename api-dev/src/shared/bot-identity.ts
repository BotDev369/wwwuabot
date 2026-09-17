/**
 * Ім'я бота — те, без чого діплінк запрошення не існує.
 *
 * **Чому тут, а не в клієнті.** Лінк запрошення має вигляд
 * `https://t.me/<bot>?start=<code>`, і скласти його може лише той, хто знає ім'я
 * бота. Платформа його не знає: `initData` дає id людини, а не бота. Тому ім'я
 * бере `api-dev` — з Telegram (`getMe`) і **з кешем у `CONTENT_KV`**: ім'я бота
 * не змінюється, а ходити в Telegram на кожен показ списку лінків — це платити
 * мережею за сталу.
 *
 * Кешується й порожній результат: якщо токена немає, кожен запит інакше
 * повторював би ту саму невдачу. Добова пауза — ціна одного зайвого походу.
 *
 * @module api-dev/src/shared/bot-identity
 */

import type { Env } from "./types";
import { apiLog } from "./logger";

/** Ключ кеша; порожній рядок у ньому теж значення — «імені немає». */
const CACHE_KEY = "bot:username";

/** Доба: ім'я бота змінюється раз у житті акаунта, а не щодня. */
const CACHE_TTL_SECONDS = 24 * 60 * 60;

/** Відповідь `getMe`, якщо вірити лише тому, що справді перевірено. */
interface GetMeResponse {
  ok?: boolean;
  result?: { username?: string };
}

/**
 * Ім'я бота без `@` — або `null`, якщо його не вдалося дізнатися.
 *
 * `null` тут не помилка: інтерфейс скаже, що лінк скласти нічим, замість того
 * щоб показати посилання, яке не відкривається.
 */
export async function readBotUsername(env: Env): Promise<string | null> {
  try {
    const cached = await env.CONTENT_KV.get(CACHE_KEY);
    if (cached !== null) return cached === "" ? null : cached;
  } catch (e: unknown) {
    // KV недоступний — не привід не мати імені: спробуємо Telegram.
    apiLog.error("Bot username cache read failed", e);
  }

  if (!env.BOT_TOKEN) return null;

  try {
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getMe`);
    const data = (await response.json()) as GetMeResponse;
    const username =
      data.ok && typeof data.result?.username === "string" ? data.result.username : "";

    try {
      await env.CONTENT_KV.put(CACHE_KEY, username, { expirationTtl: CACHE_TTL_SECONDS });
    } catch {
      // Кеш — прискорення, а не джерело істини: без нього лінк усе одно є.
    }

    return username === "" ? null : username;
  } catch (e: unknown) {
    apiLog.error("Bot username lookup failed", e);
    return null;
  }
}
