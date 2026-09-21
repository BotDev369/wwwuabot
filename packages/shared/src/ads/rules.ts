/**
 * Правила оголошення — те, за чим введене стає даними.
 *
 * Один файл на клієнт і сервер: форма в композері й перевірка в `api-dev`
 * беруть **ті самі** межі, тож поле не дає набрати те, що сервер потім обріже
 * мовчки. Друга копія цих чисел розійшлася б із першою тихо.
 *
 * **Вид оголошення — закритий список, а не вільний текст.** «Продам» і
 * «Zdam» — це не два оголошення, а одне слово, написане по-різному; закритий
 * список робить дошку фільтрованою й не залежить від того, як людина напише.
 * Невідоме значення з бази не ламає показ (`adKindLabel`), але записати його
 * неможливо (`validateAd`).
 *
 * @module @wwwuabot/shared/ads
 */

export const AD_KINDS = [
  "buy",
  "sell",
  "rentOut",
  "rentIn",
  "want",
  "swap",
  "gift",
  "offer",
  "need",
] as const;

export type AdKind = (typeof AD_KINDS)[number];

/**
 * Підписи — ті самі слова, якими людину впізнають у списку: це погляд **того,
 * хто читає** («Продам»), а не того, хто пише.
 */
export const AD_KIND_LABELS: Record<AdKind, string> = {
  buy: "Куплю",
  sell: "Продам",
  rentOut: "Здам в оренду",
  rentIn: "Зніму в оренду",
  want: "Шукаю",
  swap: "Обміняю",
  gift: "Подарую",
  offer: "Надаю послуги",
  need: "Шукаю послуги",
};

/** Типовий вид: його бачить той, хто просто відкрив дошку. */
export const DEFAULT_AD_KIND: AdKind = "sell";

export function isAdKind(value: unknown): value is AdKind {
  return typeof value === "string" && (AD_KINDS as readonly string[]).includes(value);
}

/** Підпис виду; невідоме значення показується як є, а не зникає. */
export function adKindLabel(value: unknown): string {
  return isAdKind(value) ? AD_KIND_LABELS[value] : String(value ?? "");
}

export const AD_TITLE_MAX = 120;
export const AD_BODY_MAX = 1500;
/** Ціна — **текст**, а не число: «договірна» й «2 000 ₴» — теж ціна. */
export const AD_PRICE_MAX = 40;
export const AD_PLACE_MAX = 60;

/** Рядок із краями, притиснутими до межі: те саме, що робить `sanitizeNoteText`. */
export function sanitizeLine(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/gu, " ").trim().slice(0, max);
}

/** Текст оголошення: переноси абзаців зберігаються, краї — притискаються. */
export function sanitizeBody(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, AD_BODY_MAX);
}

/** Те, що перевірено й готове до запису. */
export interface AdInput {
  kind: AdKind;
  title: string;
  body: string;
  price: string;
  place: string;
  isActive: boolean;
}

export type AdValidation = { ok: true; value: AdInput } | { ok: false; message: string };

/** Людське ім'я поля — щоб причина відмови називала те, що видно на екрані. */
function fieldOf(raw: Record<string, unknown>): Record<string, unknown> {
  return raw ?? {};
}

/**
 * Перевірка оголошення.
 *
 * Порожнє оголошення відхиляється: рядок без заголовка й без тексту нічого не
 * несе, і показувати його на дошці нема чого (та сама межа, що в нотатки).
 * Довжини не відхиляються, а притискаються: поле вже має `maxLength`, а
 * відмова на 1501-му символі читалась би як «форма зламалась».
 */
export function validateAd(raw: unknown): AdValidation {
  const input = fieldOf(raw as Record<string, unknown>);

  if (!isAdKind(input.kind)) return { ok: false, message: "Оберіть вид оголошення" };

  const title = sanitizeLine(input.title, AD_TITLE_MAX);
  const body = sanitizeBody(input.body);
  if (!title && !body) return { ok: false, message: "Заповніть заголовок або текст" };

  return {
    ok: true,
    value: {
      kind: input.kind,
      title,
      body,
      price: sanitizeLine(input.price, AD_PRICE_MAX),
      place: sanitizeLine(input.place, AD_PLACE_MAX),
      // Прапорець видимості: відсутній означає «показати». Явне `false`
      // лишає оголошення чернеткою — воно в списку власника, але не на дошці.
      isActive: input.isActive !== false,
    },
  };
}
