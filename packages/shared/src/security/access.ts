/**
 * Допуск у продукт — одне правило для бота й платформи.
 *
 * **Чому правило спільне.** Бот і вебплатформа — два входи в одне й те саме
 * продуктове місце. Якщо правило живе в кожному своє, то воно розійдеться
 * рівно тоді, коли хтось почне закривати другий вхід, а перший залишиться
 * відкритим: людина, якій відмовили в чаті, просто відкриє посилання й опиниться
 * там, де їй відмовили. Тут тільки ознака присутності — хто запросив.
 *
 * **Хто має допуск.** Людина, яку хтось запросив: `users.inviter_id` — додатне
 * ціле (`users.user_id` — Telegram-id, він не нульовий, тож `0` у колонці —
 * це «запрошував невідомий», а не допуск). Роль нічого не додає: **закритий
 * продукт закритий для всіх, включно з адміністратором** — інакше «закрито» є
 * лише на папері, а виняток з ролі треба пам'ятати щоразу, коли з'явиться
 * новий вхід.
 *
 * **Виняток один — власник.** Його не може запросити ніхто: він перший
 * користувач, тож запрошення для нього не існує. Тому секрет
 * `ADMIN_TELEGRAM_ID` дає допуск без `inviter_id`. Це не «роль адміна» (тоді
 * другий адмін з'явився б разом із помічниками), а один власник продукту, і
 * значення живе в секреті, а не в коді.
 *
 * **Терпимість до відсутньої колонки.** Значення приходить рядком із бази, тож
 * старий `SELECT *` без `withAutoMigrate` дав би `undefined` — і відмова була б
 * правильною відповіддю, але не на тій базі, де колонки ще немає. Тому
 * не-число й `undefined` — це просто «ні».
 *
 * @module @wwwuabot/shared/security/access
 */

/** Мінімально потрібна частина рядка `users`. */
export interface AccessSubject {
  user_id?: unknown;
  inviter_id?: unknown;
}

/**
 * Значення секрету `ADMIN_TELEGRAM_ID` — Telegram-id власника або `null`.
 *
 * Рядок приходить із оточення, тож це не число, а текст: сміття в секреті
 * (порожня змінна, пробіл, «abc») мусить означати «винячку немає», а не
 * відкритий продукт.
 */
export function parseOwnerTelegramId(raw: string | null | undefined): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const id = Number(trimmed);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * Чи має ця людина доступ до продукту.
 *
 * `ownerTelegramId` — значення секрету `ADMIN_TELEGRAM_ID`, а не число:
 * секрет приходить з оточення, тож розбирає його тут єдиний розбірник, і жоден
 * виклик не може «забути» про це.
 *
 * Ніколи не кидає: відмова — це відповідь, а не помилка (§7).
 */
export function hasAccess(
  user: AccessSubject | null | undefined,
  ownerTelegramId?: string | null,
): boolean {
  const ownerId = parseOwnerTelegramId(ownerTelegramId);
  const userId = user?.user_id;
  if (ownerId !== null && typeof userId === "number" && userId === ownerId) return true;

  const inviterId = user?.inviter_id;
  return typeof inviterId === "number" && Number.isInteger(inviterId) && inviterId > 0;
}
