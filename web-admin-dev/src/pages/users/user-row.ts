/**
 * Підписи рядка користувача в таблиці — чисті функції без стану.
 *
 * @module web-admin-dev/src/pages/users/user-row
 */

import type { UserRow } from "../../shared/api/users.api";
import { MAIN_TENANT } from "../tenant/tenant-key";

/** Ім'я для клітинки й заголовків: прізвище та ім'я, а як їх немає — прочерк. */
export function formatName(user: UserRow): string {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

/** Коли приєднався — у словах, а не датою: у рядку сорок людей це шум. */
export function relativeTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return value;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "щойно";
  if (diffMin < 60) return `${diffMin} хв тому`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "вчора";
  if (days < 7) return `${days} дн тому`;
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Ключ проєкту людини — той самий, що показує клітинка й сортує заголовок.
 *
 * `tenant_id NULL` — головний проєкт (D26); невідомий id без рядка `tenants`
 * лишається числом, щоб не видавати чужого за головний.
 */
export function tenantKeyOf(user: UserRow): string {
  return (
    user.tenant_key ?? (user.tenant_id && user.tenant_id !== 1 ? `#${user.tenant_id}` : MAIN_TENANT)
  );
}
