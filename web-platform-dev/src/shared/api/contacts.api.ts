/**
 * Контакти людини в платформі.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/contacts`): тут
 * лишається тільки шлях. Ідентичність додає `apiFetch` цієї оболонки —
 * підписаний `initData`; власника контакту з клієнта не передають ніколи.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createContactsApi } from "@wwwuabot/shared/contacts";
import { apiFetch } from "./client";

export const contactsApi = createContactsApi(apiFetch, "/api/contacts");
