/**
 * Селект проєкту в шапці: чий контент показує екран.
 *
 * Список — активні проєкти; поточний ключ лишається навіть тоді, коли його
 * вже немає серед активних, — інакше селект мовчки стрибнув би на головний.
 *
 * @module web-admin-dev/src/pages/tenant/ProjectSelect
 */

import { useEffect, useState } from "react";
import { listActiveTenants, type AdminTenant } from "../../shared/api/tenants.api";
import labels from "./project-labels.json";
import { MAIN_TENANT, useSelectedTenant } from "./selected-tenant.store";

/** Підпис проєкту в списку: головний названо словом, решта — своєю назвою. */
function labelOf(tenant: AdminTenant): string {
  return tenant.key === MAIN_TENANT ? labels.main : tenant.name || tenant.key;
}

export function ProjectSelect() {
  const key = useSelectedTenant((state) => state.key);
  const select = useSelectedTenant((state) => state.select);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    listActiveTenants()
      .then((list) => {
        if (alive) setTenants(list);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const options: AdminTenant[] =
    tenants.length > 0
      ? tenants
      : [{ id: 0, key: MAIN_TENANT, name: labels.main, status: "active" }];
  const missing = !options.some((tenant) => tenant.key === key);

  return (
    <>
      <select
        aria-label={labels.label}
        className="wb-select wb-search"
        title={labels.label}
        value={key}
        onChange={(event) => select(event.target.value)}
      >
        {options.map((tenant) => (
          <option key={tenant.key} value={tenant.key}>
            {labelOf(tenant)}
          </option>
        ))}
        {missing && (
          <option value={key}>
            {key} — {labels.missing}
          </option>
        )}
      </select>
      {failed && <span className="wb-text-sm wb-text-muted">{labels.listFailed}</span>}
    </>
  );
}
