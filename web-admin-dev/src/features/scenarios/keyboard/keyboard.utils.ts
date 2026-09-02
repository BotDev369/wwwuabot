import type { ButtonKind, KeyboardButtonModel, KeyboardRowModel } from "./types";

let _id = 0;
export function genId(): string {
  return `kb_${Date.now()}_${++_id}`;
}

export function newButton(kind: ButtonKind = "callback"): KeyboardButtonModel {
  return { id: genId(), text: "", kind, value: "" };
}

// UI → Telegram
export function toTelegramButton(b: KeyboardButtonModel): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(b.extra ?? {}), text: b.text };
  if (b.kind === "callback") out.callback_data = b.value;
  else if (b.kind === "url") out.url = b.value;
  else if (b.kind === "web_app") out.web_app = { url: b.value };
  return out;
}

// Telegram → UI
export function fromTelegramButton(btn: Record<string, unknown>): KeyboardButtonModel {
  const { text, callback_data, url, web_app, ...rest } = btn;
  const kind: ButtonKind =
    web_app !== undefined && web_app !== null
      ? "web_app"
      : url !== undefined && url !== null
        ? "url"
        : callback_data !== undefined && callback_data !== null
          ? "callback"
          : "none";
  let value = "";
  if (kind === "web_app") {
    const wa = web_app as Record<string, unknown>;
    value = typeof wa?.url === "string" ? wa.url : "";
  } else if (kind === "url") {
    value = String(url);
  } else if (kind === "callback") {
    value = String(callback_data);
  }
  return {
    id: genId(),
    text: typeof text === "string" ? text : String(text ?? ""),
    kind,
    value,
    extra: Object.keys(rest).length > 0 ? rest : undefined,
  };
}

// Безпечний парс: ніколи не кидає, на битому JSON повертає [].
export function parseKeyboard(json: string): KeyboardRowModel[] {
  const trimmed = (json ?? "").trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((r): r is unknown[] => Array.isArray(r))
    .map((row) => ({
      id: genId(),
      buttons: row
        .filter(
          (b): b is Record<string, unknown> =>
            typeof b === "object" && b !== null && !Array.isArray(b),
        )
        .map((b) => fromTelegramButton(b)),
    }));
}

// UI → JSON-рядок для збереження в `buttons`.
export function serializeKeyboard(rows: KeyboardRowModel[]): string {
  return JSON.stringify(rows.map((r) => r.buttons.map((b) => toTelegramButton(b))));
}

// Валідація для режиму JSON: повертає текст помилки або null.
export function validateKeyboard(json: string): string | null {
  const trimmed = (json ?? "").trim();
  if (!trimmed) return null; // порожньо = ок
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return (e as Error).message;
  }
  if (!Array.isArray(parsed)) return "має бути масивом рядків кнопок";
  return null;
}

// Повна валідація кнопок перед збереженням: JSON + структура + вміст.
// Повертає текст помилки або null, якщо все ок.
// Кнопка з типом «без дії» (лише текст, без callback_data/url) вважається
// валідною — на майбутнє для reply-клавіатури.
export function validateButtons(json: string): string | null {
  const trimmed = (json ?? "").trim();
  if (!trimmed) return null; // порожньо = кнопок немає, ок
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return "невалідний JSON";
  }
  if (!Array.isArray(parsed)) return "має бути масивом рядків кнопок";
  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    if (!Array.isArray(row)) return `рядок ${i + 1}: має бути масивом кнопок`;
    for (const btn of row) {
      if (!btn || typeof btn !== "object") return `рядок ${i + 1}: некоректна кнопка`;
      const b = btn as Record<string, unknown>;
      const text = typeof b.text === "string" ? b.text.trim() : "";
      if (text === "") {
        return `рядок ${i + 1}: є кнопка без тексту — заповни текст або видали її`;
      }
      if ("callback_data" in b && String(b.callback_data ?? "").trim() === "") {
        return `рядок ${i + 1}: кнопка «${text}» без callback_data — заповни значення`;
      }
      if ("url" in b && String(b.url ?? "").trim() === "") {
        return `рядок ${i + 1}: кнопка «${text}» без url — заповни значення`;
      }
      if ("web_app" in b) {
        const wa = b.web_app as Record<string, unknown> | undefined;
        if (!wa || typeof wa.url !== "string" || wa.url.trim() === "") {
          return `рядок ${i + 1}: кнопка «${text}» web_app без url — заповни URL веб-додатка`;
        }
      }
    }
  }
  return null;
}
