/**
 * Копіювання тексту — одна функція для всіх оболинок.
 *
 * **Чому з відкатом.** `navigator.clipboard` є лише в безпечному контексті
 * (HTTPS) і тоді, коли користувач дозволив доступ; у Telegram Mini App на
 * iOS WebView він буває недоступним, і тоді мовчки не копіюється нічого. Тому
 * другий крок — прихований `textarea` з `execCommand("copy")`: він старий, але
 * працює там, де сучасного API немає.
 *
 * **Правда в статусі.** `false` означає «не скопійовано», тож виклик може
 * сказати людині про це (`useDialog`), а не вдавати, що вийшло.
 *
 * @module packages/shared/src/utils/clipboard
 */

/** Покласти текст у буфер обміну. `false` — копіювання не вийшло. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // йдемо у відкат: відмова в доступі — не привід мовчати
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const field = document.createElement("textarea");
    field.value = text;
    // Поле мусить бути в розмітці, інакше `execCommand` не має що копіювати.
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const done = document.execCommand("copy");
    document.body.removeChild(field);
    return done;
  } catch {
    return false;
  }
}
