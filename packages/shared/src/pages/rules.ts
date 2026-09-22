/**
 * Правила сторінки — те, за чим заповнене стає даними.
 *
 * Один файл на клієнт і сервер: форма у композері й перевірка в `api-dev`
 * беруть **ті самі** межі, тож поле не дає набрати те, що сервер потім обріже
 * мовчки. Друга копія цих меж розійшлася б із першою тихо — так само, як це
 * вже зроблено для оголошень і схем теми.
 *
 * **Обов'язкове рівно одне поле — назва.** Решта може лишатись порожньою:
 * шаблон ставить на сторінку лише заповнене, тож «візитка з імені» — це
 * повноцінна сторінка, а не поламана форма.
 *
 * **Приватність типово вимкнена.** `isPublic` вмикається **явним `true`**;
 * усе інше (поле немає, `false`, «1», сміття) читається як «ще не вирішено» —
 * і сторінка лишається видимою тільки автору. Це та сама межа, що в
 * `profile_public`: мовчазна публікація показувала б людину, яка вважала, що
 * сховалась.
 *
 * @module @wwwuabot/shared/pages
 */

import { pageAddress } from "./address";
import {
  isPageTemplateKey,
  pageTemplate,
  pageTitle,
  primaryField,
  type PageField,
  type PageFieldValues,
  type PageTemplate,
} from "./templates";
import type { PageDraft, UserPage } from "./types";

/** Те, що перевірено й готове до запису: те саме, що надсилає форма. */
export interface PageDraftInput {
  template: PageTemplate["key"];
  values: PageFieldValues;
  address: string;
  isPublic: boolean;
}

export type PageValidation = { ok: true; value: PageDraftInput } | { ok: false; message: string };

/**
 * Одне поле → текст.
 *
 * Рядок стискається (переноси в ньому — випадкові), абзац зберігає переноси:
 * це та сама різниця, що між заголовком і текстом на сторінці. Довжина
 * притискається, а не відхиляється: поле вже має `maxLength`, і відмова на
 * 1201-му символі читалась би як «форма зламалась».
 */
export function cleanPageValue(field: PageField, raw: unknown): string {
  if (typeof raw !== "string") return "";
  const value = field.kind === "line" ? raw.replace(/\s+/gu, " ").trim() : raw.trim();
  return value.slice(0, field.max);
}

/** Усі поля шаблону — з сирого об'єкта форми. Невідомі ключі не переносяться. */
export function sanitizePageValues(template: PageTemplate, raw: unknown): PageFieldValues {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const values: PageFieldValues = {};
  for (const field of template.fields) {
    const value = cleanPageValue(field, source[field.key]);
    if (value) values[field.key] = value;
  }
  return values;
}

/**
 * Перевірка сторінки, яку надіслала форма.
 *
 * `id` тут не читається: чи це правка, чи створення — вирішує шлях, у який
 * прийшов запит, і контролер додає номер окремо (§7 — не змішувати адресу
 * об'єкта з його вмістом).
 */
export function validatePageDraft(raw: unknown): PageValidation {
  if (typeof raw !== "object" || raw === null) return { ok: false, message: "Очікується сторінка" };
  const source = raw as Record<string, unknown>;

  if (!isPageTemplateKey(source.template)) return { ok: false, message: "Оберіть шаблон сторінки" };
  const template = pageTemplate(source.template);

  const values = sanitizePageValues(template, source.values);
  const primary = primaryField(template);
  if (!values[primary.key]) {
    return { ok: false, message: `«${primary.label}» — заповніть: це назва сторінки` };
  }

  const address = pageAddress(source.address, pageTitle(template, values));
  if (!address.ok) return address;

  return {
    ok: true,
    value: {
      template: template.key,
      values,
      address: address.value,
      isPublic: source.isPublic === true,
    },
  };
}

/** Чернетка для форми зі збереженої сторінки — те саме, що писав автор. */
export function pageDraft(page: UserPage): PageDraft {
  return {
    id: page.id,
    template: page.template,
    values: page.values,
    address: page.slug,
    isPublic: page.isPublic,
  };
}
