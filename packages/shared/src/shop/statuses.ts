/**
 * Статуси замовлення: типові — у коді, свої — рядки в базі магазину.
 *
 * **Ключ — контракт, підпис — слово магазину.** У рядку замовлення стоїть ключ
 * (`new`, `done`, …), і він не змінюється ніколи; підпис людина переписує під
 * свій процес скільки завгодно. Тому «Нове» можна назвати «Прийнято» — історія
 * від цього не переписується, а пошук і фільтри працюють далі.
 *
 * **Магазин зберігає лише відхилення.** Типові статуси народжуються з
 * `DEFAULT_ORDER_STATUSES`, а в таблицю потрапляє тільки те, чим магазин
 * відрізняється від них: перейменування (той самий ключ, свій підпис),
 * вимкнення (`isActive: false`) і власні статуси (ключ, якого серед типових
 * немає). Без цього правила кожен новий магазин починався б із копії тих самих
 * п'яти рядків, а зміна типового набору в коді не доїхала б до жодного з них.
 *
 * **Статус не видаляють — його вимикають.** Підпис потрібен і для замовлень у
 * цьому статусі: рядок історії не має права лишитись без назви. Тому вимкнений
 * статус лишається у списку з `isActive: false` (екран налаштувань має що
 * показати й повернути), а пропонується для нових замовлень лише те, що
 * `activeOrderStatuses`.
 *
 * @module @wwwuabot/shared/shop
 */

/** Стадія: замовлення в роботі чи вже завершене. */
export type OrderStatusStage = "open" | "closed";

export interface DefaultOrderStatus {
  readonly key: string;
  readonly label: string;
  readonly stage: OrderStatusStage;
}

/**
 * Типовий потік: замовлення прийняли → підтвердили → надіслали → виконали
 * (або скасували). Підписи — звичайні слова, а не службові назви: їх бачить
 * і покупець, і продавець.
 */
export const DEFAULT_ORDER_STATUSES: readonly DefaultOrderStatus[] = [
  { key: "new", label: "Нове", stage: "open" },
  { key: "confirmed", label: "Підтверджено", stage: "open" },
  { key: "sent", label: "Надіслано", stage: "open" },
  { key: "done", label: "Виконано", stage: "closed" },
  { key: "cancelled", label: "Скасовано", stage: "closed" },
];

/** Ключ статусу в замовленні. */
export const ORDER_STATUS_KEY_MAX = 24;
/** Стеля підпису — він стоїть у списку вибору й у рядку замовлення. */
export const ORDER_STATUS_LABEL_MAX = 40;

const STATUS_KEY_RE = /^[a-z][a-z0-9-]*$/;

/**
 * Чи ключ годиться.
 *
 * Ключ не потрапляє ні в адресу, ні в Telegram-payload (це внутрішнє ім'я), але
 * лишається ASCII-словом: український підпис у ключі зробив би його
 * незрівнюваним із типовим і перетворив би перейменування на другий статус.
 */
export function isValidOrderStatusKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= ORDER_STATUS_KEY_MAX &&
    STATUS_KEY_RE.test(value)
  );
}

/** Чи ключ типового статусу: такий рядок у базі означає перейменування. */
export function isDefaultOrderStatusKey(key: unknown): boolean {
  return typeof key === "string" && DEFAULT_ORDER_STATUSES.some((status) => status.key === key);
}

/** Відхилення магазину — те, що лежить у його таблиці статусів. */
export interface OrderStatusOverride {
  /** Ключ: збігається з типовим — перейменування або вимкнення, інакше — свій статус. */
  readonly key: string;
  /** Підпис магазину; порожній — лишається типовий. */
  readonly label?: string | null;
  /** Стадія свого статусу; у типового — його власна, якщо не задано іншого. */
  readonly stage?: OrderStatusStage | null;
  /** `false` — статус вимкнено: він у списку, але його не пропонують. */
  readonly isActive?: boolean;
}

/** Статус, як його бачить екран: ключ, підпис, стадія, походження й видимість. */
export interface OrderStatus {
  readonly key: string;
  readonly label: string;
  readonly stage: OrderStatusStage;
  /** `true` — статус завів сам магазин (немає серед типових). */
  readonly isCustom: boolean;
  /** `false` — вимкнено для нових замовлень; старі лишаються з підписом. */
  readonly isActive: boolean;
}

/** Підпис статусу з форми: краї притиснуті, межа — `ORDER_STATUS_LABEL_MAX`. */
export function sanitizeStatusLabel(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/gu, " ").trim().slice(0, ORDER_STATUS_LABEL_MAX);
}

function cleanStage(raw: unknown): OrderStatusStage | null {
  return raw === "open" || raw === "closed" ? raw : null;
}

/** Що магазин змінює у статусі: перейменування, стадію, вимкнення — або власний статус. */
export interface OrderStatusOverrideInput {
  key: string;
  label: string;
  /** `null` — стадію не задано: у типового лишається його, у власного — `open`. */
  stage: OrderStatusStage | null;
  isActive: boolean;
}

export type OrderStatusOverrideValidation =
  { ok: true; value: OrderStatusOverrideInput } | { ok: false; message: string };

/**
 * Перевірка правки статусу з форми.
 *
 * Дві відмови, і обидві — про майбутнє читання: ключ мусить бути **словом**
 * (український ключ не зрівнявся б із типовим і перетворив би перейменування на
 * другий статус), а власний статус мусить мати **підпис** (без нього в рядку
 * замовлення стояв би ключ — `in-progress`, а не «В роботі»). У типового
 * порожній підпис — це саме законний стан: «лишити як у коді».
 */
export function validateOrderStatusOverride(raw: unknown): OrderStatusOverrideValidation {
  if (typeof raw !== "object" || raw === null) return { ok: false, message: "Очікується статус" };
  const source = raw as Record<string, unknown>;

  if (!isValidOrderStatusKey(source.key)) {
    return { ok: false, message: "Ключ статусу — з літери, далі латиниця, цифри й дефіс" };
  }

  const label = sanitizeStatusLabel(source.label);
  if (!label && !isDefaultOrderStatusKey(source.key)) {
    return { ok: false, message: "У власного статусу мусить бути підпис" };
  }

  return {
    ok: true,
    value: {
      key: source.key,
      label,
      stage: cleanStage(source.stage),
      // Вимкненим статус роблять явно: відсутній прапорець означає «показувати».
      isActive: source.isActive !== false,
    },
  };
}

/**
 * Повний список статусів магазину: типові (з правками) і свої — в тому
 * порядку, у якому їх віддав виклик (база впорядковує свої рядки сама).
 *
 * Незрозумілі рядки пропускаються, а не ламають екран: у базі могло лишитись
 * значення від давнішого коду, і воно не має права сховати робочий список.
 */
export function resolveOrderStatuses(
  overrides: readonly OrderStatusOverride[] = [],
): OrderStatus[] {
  const byKey = new Map<string, OrderStatusOverride>();
  for (const override of overrides) {
    if (!isValidOrderStatusKey(override?.key)) continue;
    if (byKey.has(override.key)) continue;
    byKey.set(override.key, override);
  }

  const statuses: OrderStatus[] = DEFAULT_ORDER_STATUSES.map((status) => {
    const override = byKey.get(status.key);
    byKey.delete(status.key);
    return {
      key: status.key,
      label: sanitizeStatusLabel(override?.label) || status.label,
      stage: cleanStage(override?.stage) ?? status.stage,
      isCustom: false,
      isActive: override?.isActive !== false,
    };
  });

  for (const override of byKey.values()) {
    statuses.push({
      key: override.key,
      label: sanitizeStatusLabel(override.label) || override.key,
      stage: cleanStage(override.stage) ?? "open",
      isCustom: true,
      isActive: override.isActive !== false,
    });
  }

  return statuses;
}

/** Те, що можна поставити новому замовленню. */
export function activeOrderStatuses(statuses: readonly OrderStatus[]): OrderStatus[] {
  return statuses.filter((status) => status.isActive);
}

/**
 * Підпис за ключем; невідомий ключ показується як є, а не зникає.
 *
 * Це не перестраховка: ключ у замовленні живе довше за рядок статусу — його
 * могло бути вимкнено, а замовлення лишилось, і без підпису історія виглядала
 * б як порожнє поле.
 */
export function orderStatusLabel(key: unknown, statuses: readonly OrderStatus[]): string {
  const value = typeof key === "string" ? key : "";
  return statuses.find((status) => status.key === value)?.label ?? value;
}
