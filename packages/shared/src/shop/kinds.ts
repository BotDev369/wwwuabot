/**
 * Види товару — закритий перелік у коді, бо вид — це **поведінка**, а не слово.
 *
 * «Фізичний», «цифровий» і «послуга» — не три назви одного товару, а три різні
 * потоки: фізичний питає адресу доставки, цифровий має файл і не має доставки
 * взагалі, послуга виконується в часі. Своє слово тут нічого не важить: за
 * словом мусить стояти код, який його виконує, — а коду, написаного під
 * вигаданий магазином вид, немає. Тому перелік закритий, а магазин користується
 * тим, що справді продає.
 *
 * Невідоме значення з бази не ламає показ (`productKindLabel` віддає його як є),
 * але записати його неможливо (`isProductKind`) — те саме правило, що в
 * оголошеннях (`packages/shared/src/ads/rules.ts`).
 *
 * @module @wwwuabot/shared/shop
 */

export const PRODUCT_KINDS = ["physical", "digital", "service"] as const;

export type ProductKind = (typeof PRODUCT_KINDS)[number];

/** Що вид означає для потоку замовлення. */
export interface ProductKindSpec {
  readonly key: ProductKind;
  /** Підпис для людини — те саме слово, що в списку вибору й у картці. */
  readonly label: string;
  /** Замовлення питає адресу доставки. */
  readonly needsShipping: boolean;
  /** Товар продається файлом: він у нього буває, а доставки немає. */
  readonly hasFile: boolean;
}

export const PRODUCT_KIND_SPECS: Record<ProductKind, ProductKindSpec> = {
  physical: { key: "physical", label: "Фізичний товар", needsShipping: true, hasFile: false },
  digital: { key: "digital", label: "Цифровий товар", needsShipping: false, hasFile: true },
  service: { key: "service", label: "Послуга", needsShipping: false, hasFile: false },
};

/** Типовий вид: його бачить той, хто просто додає товар. */
export const DEFAULT_PRODUCT_KIND: ProductKind = "physical";

export function isProductKind(value: unknown): value is ProductKind {
  return typeof value === "string" && (PRODUCT_KINDS as readonly string[]).includes(value);
}

/** Підпис виду; невідоме значення показується як є, а не зникає. */
export function productKindLabel(value: unknown): string {
  return isProductKind(value) ? PRODUCT_KIND_SPECS[value].label : String(value ?? "");
}

/**
 * Чи потрібна доставка.
 *
 * Невідомий вид доставки **не** просить: форма, яка питає адресу там, де її
 * нема куди подіти, збирала б дані, яких ніхто не читає.
 */
export function productKindNeedsShipping(value: unknown): boolean {
  return isProductKind(value) && PRODUCT_KIND_SPECS[value].needsShipping;
}

/** Чи в товару буває файл (те, що видають, а не відправляють). */
export function productKindHasFile(value: unknown): boolean {
  return isProductKind(value) && PRODUCT_KIND_SPECS[value].hasFile;
}
