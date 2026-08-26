// Захисне видобування тексту з будь-якої форми, що може прийти від Telegram.
// Гарантує повернення рядка, щоб об'єкт ніколи не потрапив у JSX (React error #31).
export function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((part) => toText(part)).join("");
  if (value && typeof value === "object" && "text" in value) {
    return toText((value as { text: unknown }).text);
  }
  return "";
}
