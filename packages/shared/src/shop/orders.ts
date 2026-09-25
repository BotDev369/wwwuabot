/**
 * Правила замовлення — те, за чим натиснуте «замовити» стає даними.
 *
 * **Що питати в покупця — вирішує вид товару, а не форма.** Фізичний товар
 * треба кудись надіслати (адреса), цифровий — нікуди: його **віддають** файлом
 * чи посиланням, тож адреса доставки в нього була б полем, якого ніхто не
 * читає. Перелік полів тому залежить від `needsShipping`
 * (`@wwwuabot/shared/shop/kinds`), а не від того, як названа форма.
 *
 * **Скрізь питаємо ім'я й телефон, і це не «про всяк випадок».** Продавець мусить
 * мати спосіб відповісти на замовлення поза платформою — вона ж і є єдиним
 * місцем, де факт замовлення існує.
 *
 * **Замовлення несе знімок, а не посилання на товар.** Назву, ціну й вид
 * копіює сервіс на момент замовлення (`docs/SHOPS.md` §6): правка ціни заднім
 * числом не має переписувати історію. Тому клієнт надсилає лише **номери
 * товарів і кількість** — ціну він не називає взагалі, її беремо з бази.
 *
 * @module @wwwuabot/shared/shop
 */

import type { OrderContact } from "./types";

export const ORDER_NOTE_MAX = 600;
/** Стеля кошика: замовлення — це покупка, а не перенесення каталогу. */
export const ORDER_ITEMS_MAX = 20;
/** Стеля кількості однієї позиції. */
export const ORDER_QTY_MAX = 99;

/** Поле контакту покупця: підпис, межа й чи обов'язкове воно. */
export interface OrderContactField {
  key: string;
  label: string;
  max: number;
  required: boolean;
}

const CONTACT_NAME_MAX = 80;
const CONTACT_PHONE_MAX = 40;
const CONTACT_ADDRESS_MAX = 200;
const CONTACT_CHANNEL_MAX = 120;

/**
 * Що питаємо в покупця.
 *
 * `required` тут — не «поле форми», а «без цього замовлення не існує»: без
 * імені й телефону продавець не знає, кому відповідати; без адреси фізичний
 * товар нікуди надіслати; без каналу цифровий нікуди подіти.
 */
export function orderContactFields(needsShipping: boolean): readonly OrderContactField[] {
  const base: OrderContactField[] = [
    { key: "name", label: "Ім'я", max: CONTACT_NAME_MAX, required: true },
    { key: "phone", label: "Телефон", max: CONTACT_PHONE_MAX, required: true },
  ];

  return needsShipping
    ? [
        ...base,
        { key: "address", label: "Адреса доставки", max: CONTACT_ADDRESS_MAX, required: true },
      ]
    : [
        ...base,
        {
          key: "channel",
          label: "Куди надіслати (нік або пошта)",
          max: CONTACT_CHANNEL_MAX,
          required: true,
        },
      ];
}

export type OrderContactResult = { ok: true; value: OrderContact } | { ok: false; message: string };

/**
 * Контакт покупця — лише ті поля, які ми справді питаємо.
 *
 * Зайві ключі **відкидаються**, а не зберігаються: JSON-колонка з довільними
 * полями перетворила б контакт на друге сховище, яке читають «як домовились»
 * — тобто ніяк.
 */
export function sanitizeOrderContact(raw: unknown, needsShipping: boolean): OrderContactResult {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const contact: Record<string, string> = {};

  for (const field of orderContactFields(needsShipping)) {
    const value = source[field.key];
    const text =
      typeof value === "string" ? value.replace(/\s+/gu, " ").trim().slice(0, field.max) : "";
    if (!text) {
      if (field.required) return { ok: false, message: `«${field.label}» — обов'язкове поле` };
      continue;
    }
    contact[field.key] = text;
  }

  return { ok: true, value: contact };
}

/** Позиція кошика так, як її надіслав клієнт: номер товару й кількість. */
export interface OrderItemInput {
  productId: number;
  qty: number;
}

/**
 * Кошик: номери товарів і кількості.
 *
 * Повтор одного товару **складається**, а не лишає останню кількість: покупець,
 * який натиснув «додати» двічі, замовив два, і мовчазне «останній переміг»
 * зменшило б замовлення без його відома.
 */
export function cleanOrderItems(raw: unknown): OrderItemInput[] {
  if (!Array.isArray(raw)) return [];

  const items: OrderItemInput[] = [];
  const byProduct = new Map<number, OrderItemInput>();
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const source = entry as Record<string, unknown>;
    const productId = Number(source.productId);
    if (!Number.isInteger(productId) || productId <= 0) continue;

    const qty = Math.min(Math.max(Math.floor(Number(source.qty) || 1), 1), ORDER_QTY_MAX);
    const existing = byProduct.get(productId);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, ORDER_QTY_MAX);
      continue;
    }

    const item: OrderItemInput = { productId, qty };
    byProduct.set(productId, item);
    items.push(item);
    if (items.length >= ORDER_ITEMS_MAX) break;
  }
  return items;
}

/** Те, що перевірено й готове до запису. */
export interface OrderDraftInput {
  items: OrderItemInput[];
  contact: OrderContact;
  note: string;
}

export type OrderValidation = { ok: true; value: OrderDraftInput } | { ok: false; message: string };

/**
 * Перевірка замовлення.
 *
 * **Порожній кошик відхиляється** — і це єдина справді обов'язкова частина:
 * замовлення без позицій не має ні суми, ні змісту, і продавець дізнався б про
 * нього нічого. Саме тому порожній кошик не «проходить із нулем».
 */
export function validateOrderDraft(raw: unknown, needsShipping: boolean): OrderValidation {
  if (typeof raw !== "object" || raw === null)
    return { ok: false, message: "Очікується замовлення" };
  const source = raw as Record<string, unknown>;

  const items = cleanOrderItems(source.items);
  if (items.length === 0) return { ok: false, message: "Кошик порожній — оберіть товар" };

  const contact = sanitizeOrderContact(source.contact, needsShipping);
  if (!contact.ok) return contact;

  const note = typeof source.note === "string" ? source.note.trim().slice(0, ORDER_NOTE_MAX) : "";

  return { ok: true, value: { items, contact: contact.value, note } };
}
