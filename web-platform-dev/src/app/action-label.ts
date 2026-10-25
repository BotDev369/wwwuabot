/**
 * Що людина зробила — словами з екрана: ім'я контрола й назва поля при виборі.
 * Вид контрола не пишеться («кнопка», «вкладка» — мова розмітки), а
 * **введений текст не пишеться ніколи**: журнал описує дію, а не переписує
 * те, що людина набрала (наслідок уже є рядком сервера — «Надіслав повідомлення»).
 *
 * @module web-platform-dev/src/app/action-label
 */

/** Одна дія: що людина бачила й що обрала. */
export interface Gesture {
  /** Ім'я контрола — те, що людина читає на ньому. */
  label: string;
  /** Назва поля — лише для вибору: без неї «мл» не каже, що вибрали. */
  field?: string;
}

/**
 * Вихід — не подія: «Закрити», «Скасувати», «Назад» кажуть, що людина пішла,
 * і нічого — про те, що вона робила. Такі контроли в журнал не потрапляють
 * (`docs/EVENTS.md`).
 */
const EXIT_LABEL = /^(закр|зачин|скасув|назад|поверн|cancel|close|back|dismiss|←|‹|✕|✖)/i;

/**
 * Явне ім'я дії від самої розмітки: картка з кількох рядків називає себе
 * одним словом, замість того щоб віддати журналові весь свій текст.
 * `data-log="-"` — «цей дотик не описуй».
 */
const LOG_NAME_ATTR = "data-log";
const NO_LOG_NAME = "-";

/** Межа підпису: журнал описує дію, а не переказує весь текст картки. */
export const GESTURE_LABEL_MAX = 100;

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

function collapsed(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function clipped(text: string, max = GESTURE_LABEL_MAX): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Явне ім'я від розмітки — те, що не треба вгадувати з тексту. */
function explicitName(element: Element): string | null {
  return collapsed(element.getAttribute(LOG_NAME_ATTR));
}

/**
 * Підпис контрола: явне ім'я розмітки, далі `aria-label` і `title`, далі
 * заголовок усередині, і аж тоді текст. Картка без жодного з них віддала б
 * журналові злиплий рядок своїх полів — тож такій картці ім'я задають
 * атрибутом `data-log`.
 */
function labelOf(element: Element): string {
  const heading = element.querySelector("h1, h2, h3, h4, [role='heading']");
  return (
    explicitName(element) ||
    collapsed(element.getAttribute("aria-label")) ||
    collapsed(element.getAttribute("title")) ||
    collapsed(heading?.textContent) ||
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

/**
 * Дотик: найближчий **контрол** угору від цілі.
 *
 * Контрол — це те, що справді натискають (кнопка, посилання, пункт, поле).
 * Дотик по тексту сторінки — повідомленню, значку, підпису — дією не є: саме
 * він наповнював журнал рядками з самого вмісту, які нічого не описують
 * (`docs/EVENTS.md`).
 */
export function gestureOf(target: Element | null): Gesture | null {
  if (!target || typeof target.closest !== "function") return null;
  // Дотик у поле — не дія: значення в журнал не пишеться взагалі.
  if (target.closest("input, textarea, select")) return null;
  const control = target.closest(CONTROL_SELECTOR);
  if (!control) return null;
  const name = explicitName(control);
  if (name === NO_LOG_NAME) return null;
  const label = labelOf(control);
  if (!label || EXIT_LABEL.test(label)) return null;
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
 * «Публічний профіль» не пояснює, що саме ввімкнули. Текст, набраний у полі,
 * сюди не належить: він не пишеться ніколи.
 */
export function choiceOf(target: Element | null): Gesture | null {
  if (!target || typeof target.closest !== "function") return null;
  const field = target.closest("select, input, [role='switch']");
  if (!field) return null;
  if (field instanceof HTMLInputElement && field.type !== "checkbox" && field.type !== "radio") {
    return null;
  }

  const name = fieldNameOf(field);
  const value = valueOf(field);
  const label = clipped(value || name);
  if (!label) return null;
  return name ? { label, field: name } : { label };
}
