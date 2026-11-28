/**
 * Фільтр «Проєкт» над таблицею користувачів.
 *
 * Список проєктів береться з уже завантажених людей: окремий запит показав би
 * й проєкти без жодної людини, і вибір давав би порожню таблицю.
 *
 * @module web-admin-dev/src/pages/users/UsersProjectFilter
 */

import { useMemo } from "react";
import { useUsersStore } from "../../features/users/store";
import projectLabels from "../tenant/project-labels.json";
import { MAIN_TENANT } from "../tenant/tenant-key";
import { tenantKeyOf } from "./user-row";

export function UsersProjectFilter() {
  const { items, tenantFilter, setTenantFilter } = useUsersStore();

  const projects = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const user of items) {
      const key = tenantKeyOf(user);
      if (!byKey.has(key)) {
        byKey.set(key, user.tenant_name && user.tenant_name !== key ? user.tenant_name : "");
      }
    }
    return [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (projects.length === 0) return null;

  return (
    <select
      aria-label={projectLabels.label}
      className="wb-select wb-search"
      value={tenantFilter ?? ""}
      onChange={(event) => setTenantFilter(event.target.value === "" ? null : event.target.value)}
    >
      <option value="">{projectLabels.allProjects}</option>
      {projects.map(([key, name]) => (
        <option key={key} value={key}>
          {name ? `${key} — ${name}` : key === MAIN_TENANT ? `${key} — ${projectLabels.main}` : key}
        </option>
      ))}
    </select>
  );
}
