/**
 * Ім'я бота для платформи — з нього складається діплінк «Поділитись».
 *
 * Не `/api/bot/info`: той шлях під адмін-префіксом, а Mini App ходить із
 * підписаним `initData` і дістав би 401. `null` — не помилка: інтерфейс тоді
 * покаже веб-адресу замість посилання, яке не відкривається.
 * @module api-dev/src/controllers/bot-username
 */

import type { Env } from "../shared/types";
import { readBotUsername } from "../shared/bot-identity";

export async function handleBotUsername(env: Env): Promise<Response> {
  const username = await readBotUsername(env);
  return new Response(JSON.stringify({ username }), {
    headers: { "Content-Type": "application/json" },
  });
}
