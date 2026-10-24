/**
 * Що людина зробила — словами з екрана: підпис контрола, назва поля й те, що
 * вона туди ввела. Вид контрола не пишеться: «кнопка» й «вкладка» — мова
 * розмітки, а не поведінки. Назва поля лишається: без неї «Київ» не каже, що
 * людина вибрала місто.
 *
 * @module web-platform-dev/src/app/action-label
 */

/** Одна дія: що людина бачила й що обрала або ввела. */
export interface Gesture {
  /** Підпис, який людина бачить, або введене значення. */
  label: string;
  /** Назва поля — лише для вибору й уведення. */
  field?: string;
}

/** Межа підпису: журнал описує дію, а не переказує весь текст картки. */
export const GESTURE_LABEL_MAX = 100;

/** Межа введеного тексту: рядок журналу не мусить бути статтею. */
export const GESTURE_VALUE_MAX = 200;

/** Те, що людина сприймає як одне натискання. */
const CONTROL_SELECTOR = [
  "button",
  "a[href]",
  "[role='button']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='switch']",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
].join(",");

/** Поля, чий вміст не описує поведінку: секрети й файли. */
const PRIVATE_AUTOCOMPLETE = ["cc-", "one-time-code", "current-password", "new-password"];
const PRIVATE_INPUT_TYPES = ["password", "hidden", "file", "checkbox", "radio"];

function collapsed(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function clipped(text: string, max = GESTURE_LABEL_MAX): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Підпис контрола: явний (`aria-label`, `title`) важливіший за текст усередині. */
function labelOf(element: Element): string {
  return (
    collapsed(element.getAttribute("aria-label")) ||
    collapsed(element.getAttribute("title")) ||
    collapsed(element.textContent)
  );
}

/**
 * Назва поля: явний підпис або `<label>`. `placeholder` назвою не є: він каже
 * «Почніть писати…» — підказка про вміст, а не ім'я поля.
 */
function fieldNameOf(field: Element): string {
  // `<label htmlFor>` — не предок поля, а сусід: тому `labels`, а не `closest`.
  const linked =
    field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
      ? field.labels?.[0]
      : null;
  const explicit =
    collapsed(field.getAttribute("aria-label")) ||
    collapsed(linked?.textContent) ||
    collapsed(field.closest("label")?.textContent) ||
    collapsed(field.getAttribute("title"));
  return clipped(explicit);
}

function isPrivate(field: HTMLInputElement): boolean {
  if (PRIVATE_INPUT_TYPES.includes(field.type)) return true;
  const autocomplete = field.getAttribute("autocomplete") ?? "";
  return PRIVATE_AUTOCOMPLETE.some((marker) => autocomplete.includes(marker));
}

/**
 * Дотик: найближчий контрол угору від цілі.
 *
 * Картка, яка не є кнопкою, теж має стати рядком журналу — тож коли контрола
 * немає, береться сам елемент і його текст. Порожній підпис (фон, роздільник)
 * у журнал не потрапляє: це місце, а не дія.
 */
export function gestureOf(target: Element | null): Gesture | null {
  if (!target || typeof target.closest !== "function") return null;
  // Дотик у поле — це не дія: те, що людина туди ввела, пише `entryOf`.
  if (target.closest("input, textarea, select")) return null;
  const control = target.closest(CONTROL_SELECTOR) ?? target;
  const label = labelOf(control);
  if (!label) return null;
  return { label: clipped(label) };
}

/** Обране значення поля — саме те, що людина вибрала. */
function valueOf(field: Element): string {
  if (field instanceof HTMLSelectElement) {
    return collapsed(field.selectedOptions[0]?.textContent);
  }
  if (field instanceof HTMLInputElement) {
    if (field.type === "checkbox" || field.type === "radio") {
      return field.checked ? "увімкнено" : "вимкнено";
    }
  }
  return "";
}

/**
 * Вибір у полі: перемикач, список, галочка.
 *
 * Підпис — обране значення, а назва поля йде окремо: «увімкнено» без
 * «Публічний профіль» не пояснює, що саме ввімкнули.
 */
export function choiceOf(target: Element | null): Gesture | null {
  if (!target || typeof target.closest !== "function") return null;
  const field = target.closest("select, input, [role='switch']");
  if (!field) return null;
  // Текст пише `entryOf`, а не вибір: інакше те саме поле давало б два рядки.
  if (field instanceof HTMLInputElement && field.type !== "checkbox" && field.type !== "radio") {
    return null;
  }

  const name = fieldNameOf(field);
  const value = valueOf(field);
  const label = clipped(value || name);
  if (!label) return null;
  return name ? { label, field: name } : { label };
}

/**
 * Уведений текст — те, що людина **написала**. Секрети й файли не пишуться
 * ніколи: журнал описує поведінку, а не зберігає пароль. Порожнє поле теж не
 * подія — людина стерла текст, і це видно з наступного запису.
 */
export function entryOf(target: Element | null): Gesture | null {
  if (!target || typeof target.closest !== "function") return null;
  const field = target.closest("input, textarea");
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return null;
  if (field instanceof HTMLInputElement && isPrivate(field)) return null;

  const value = clipped(collapsed(field.value), GESTURE_VALUE_MAX);
  if (!value) return null;
  const name = fieldNameOf(field);
  return name ? { label: value, field: name } : { label: value };
}
