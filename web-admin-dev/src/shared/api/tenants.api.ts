/**
 * Проєкти для селекта панелі.
 *
 *`/api/admin/tenants` віддає всі проєкти з кількістю членів; селект показує
 * лише активні, бо в архівний контент писати нікуди.
 *
 * @module web-admin-dev/src/shared/api/tenants.api
 */

import { apiFetch } from "./client";

/** Проєкт у відповіді адмін-API. */
export interface AdminTenant {
  id: number;
  key: string;
  name: string;
  status: string;
  members?: number;
}

/** Усі проєкти — старший першим. */
export async function listAdminTenants(): Promise<AdminTenant[]> {
  const res = await apiFetch<{ tenants: AdminTenant[] }>("/api/admin/tenants");
  return res.tenants ?? [];
}

/** Активні проєкти: з них складається селект. */
export async function listActiveTenants(): Promise<AdminTenant[]> {
  const tenants = await listAdminTenants();
  return tenants.filter((tenant) => tenant.status === "active");
}
