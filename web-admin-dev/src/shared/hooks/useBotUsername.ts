/**
 * Ім'я бота для діплінків — запитується один раз на сесію.
 *
 * **Навіщо хук, а не константа.** Ім'я бота не належить фронтенду: воно
 * змінюється разом із токеном, і в деві воно одне, а в майбутньому проді інше.
 * Єдине джерело правди — Telegram (`getMe` через `/api/bot/info`), тому
 * хардкод тут дав би посилання, яке веде в чужого бота.
 *
 * Кеш — на модулі, а не в стані: ім'я не змінюється під час сесії, а картку
 * рядка відкривають і закривають десятки разів. `null` у кеші означає «питали,
 * не вийшло» — і тоді повторних запитів теж немає, інакше невдалий `getMe`
 * бив би по API на кожне відкриття картки.
 *
 * @module web-admin-dev/src/shared/hooks/useBotUsername
 */

import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

interface TelegramGetMe {
  ok: boolean;
  result?: { username?: string };
}

/** `undefined` — ще не питали; `null` — питали, імені немає. */
let cached: string | null | undefined;

export function useBotUsername(): string | null {
  const [username, setUsername] = useState<string | null>(cached ?? null);

  useEffect(() => {
    if (cached !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- кеш модуля: синхронно віддаємо те, що вже знаємо
      setUsername(cached);
      return;
    }

    let cancelled = false;
    apiFetch<TelegramGetMe>("/api/bot/info")
      .then((info) => {
        cached = info.result?.username ?? null;
        if (!cancelled) setUsername(cached);
      })
      .catch(() => {
        cached = null;
        if (!cancelled) setUsername(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return username;
}
