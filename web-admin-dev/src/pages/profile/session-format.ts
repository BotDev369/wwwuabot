/**
 * Чисті помічники екрана профілю в адмінці: форматування терміну сесії та
 * розбір введеного ID. Жодного стану й жодного JSX — тому їх легко перевірити.
 *
 * @module web-admin-dev/src/pages/profile/session-format
 */

/** Час (година:хвилина) у місцевому поясі людини — без зайвих слів про день. */
function formatClock(ms: number): string {
  return new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(ms),
  );
}

/**
 * Термін дії сесії панелі людською мовою.
 *
 * Сесія живе годинами, а не днями, тож показуємо час, а не дату; коли термін
 * уже минув (сторінка відкрита давно), кажемо це прямо — інакше «діє до 09:15»
 * виглядало б як робочий стан.
 */
export function formatSessionExpiry(expiresAt: number | null, now = Date.now()): string {
  if (expiresAt === null || !Number.isFinite(expiresAt)) return "невідомо";
  if (expiresAt <= now) return "термін минув — потрібен новий вхід";
  return `до ${formatClock(expiresAt)}`;
}

/**
 * ID користувача з поля пошуку. `null` — це не число: перевірка тут, щоб
 * порожній рядок не пішов у запит і не повернувся загадковою помилкою.
 */
export function parseUserIdInput(value: string): number | null {
  const digits = value.trim();
  if (!/^\d+$/.test(digits)) return null;
  const id = Number(digits);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
