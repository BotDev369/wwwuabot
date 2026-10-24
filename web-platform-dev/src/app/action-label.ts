/**
 * Що саме людина натиснула — у словах, які видно на екрані: підпис контрола
 * (`aria-label`, `title`, текст), його вид і обране значення. Чиста функція над
 * DOM — без стану, запитів і знання про екрани.
 *
 * @module web-platform-dev/src/app/action-label
 */

/** Один дотик або вибір: що натиснули й чим воно було. */
export interface Gesture {
  /** Підпис, який людина бачить на кнопці. */
  label: string;
  /** Вид контрола — «кнопка», «вкладка», «поле». */
  target: string;
}

/** Межа підпису: журнал описує дотик, а не переказує весь текст картки. */
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

function clipped(text: string): string {
  return text.length <= GESTURE_LABEL_MAX ? text : `${text.slice(0, GESTURE_LABEL_MAX - 1)}…`;
}

/** Вид контрола — те, що стоїть поруч із підписом у журналі. */
function kindOf(element: Element): string {
  const role = element.getAttribute("role");
  if (role === "tab") return "вкладка";
  if (role === "switch") return "перемикач";
  if (role) return role;

  const tag = element.tagName.toLowerCase();
  if (tag === "button") return "кнопка";
  if (tag === "a") return "посилання";
  if (tag === "select" || tag === "input" || tag === "textarea") return "поле";
  if (tag === "label") return "підпис";
  return tag;
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
 * Дотик: найближчий контрол угору від цілі.
 *
 * Картка, яка не є кнопкою, теж має стати рядком журналу — тож коли контрола
 * немає, береться сам елемент і його текст. Порожній підпис (фон, роздільник)
 * у журнал не потрапляє: це місце, а не дія.
 */
export function gestureOf(target: Element | null): Gesture | null {
  if (!target || typeof target.closest !== "function") return null;
  const control = target.closest(CONTROL_SELECTOR) ?? target;
  const label = labelOf(control);
  if (!label) return null;
  return { label: clipped(label), target: kindOf(control) };
}

/** Обране значення поля — саме те, що людина вибрала, а не те, що вона ввела. */
function valueOf(field: Element): string {
  if (field instanceof HTMLSelectElement) {
    return collapsed(field.selectedOptions[0]?.textContent);
  }
  if (field instanceof HTMLInputElement) {
    if (field.type === "checkbox" || field.type === "radio") {
      return field.checked ? "увімкнено" : "вимкнено";
    }
    // Введений текст у журнал не копіюється: це приватне, а не поведінка.
    return "";
  }
  return "";
}

/**
 * Вибір у полі: перемикач, список, галочка.
 *
 * Підпис поля береться з `aria-label` або з його `<label>` — без цього рядок
 * «увімкнено» не пояснює, що саме ввімкнули.
 */
export function choiceOf(target: Element | null): Gesture | null {
  if (!target || typeof target.closest !== "function") return null;
  const field = target.closest("select, input, textarea, [role='switch']");
  if (!field) return null;

  const name =
    collapsed(field.getAttribute("aria-label")) ||
    collapsed(field.getAttribute("title")) ||
    collapsed(field.closest("label")?.textContent);
  const value = valueOf(field);
  const label = [name, value].filter(Boolean).join(": ");
  if (!label) return null;
  return { label: clipped(label), target: kindOf(field) };
}
