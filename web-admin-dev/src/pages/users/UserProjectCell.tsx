/**
 * Клітинка «Проєкт»: ключ і назва поточного проєкту людини.
 *
 * @module web-admin-dev/src/pages/users/UserProjectCell
 */

import type { UserRow } from "../../shared/api/users.api";
import projectLabels from "../tenant/project-labels.json";
import { MAIN_TENANT } from "../tenant/tenant-key";
import { tenantKeyOf } from "./user-row";

export function UserProjectCell({ user }: { user: UserRow }) {
  const key = tenantKeyOf(user);
  // Головний проєкт назви в `tenants` може не мати — тоді його слово бере лейбл.
  const name =
    user.tenant_name && user.tenant_name !== key
      ? user.tenant_name
      : key === MAIN_TENANT
        ? projectLabels.main
        : null;

  return (
    <>
      <span className="wb-cell-mono">{key}</span>
      {name && <span className="wb-text-muted wb-text-xs"> {name}</span>}
    </>
  );
}
