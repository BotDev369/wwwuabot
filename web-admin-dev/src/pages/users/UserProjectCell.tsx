/**
 * Клітинка «Проєкт»: ключ і назва поточного проєкту людини.
 *
 * @module web-admin-dev/src/pages/users/UserProjectCell
 */

import type { UserRow } from "../../shared/api/users.api";
import projectLabels from "../tenant/project-labels.json";

export function UserProjectCell({ user }: { user: UserRow }) {
  // `tenant_id NULL` — головний проєкт (D26), а не «немає проєкту».
  const key =
    user.tenant_key ??
    (user.tenant_id && user.tenant_id !== 1 ? `#${user.tenant_id}` : projectLabels.main);
  return (
    <>
      <span className="wb-cell-mono">{key}</span>
      {user.tenant_name && user.tenant_name !== key && (
        <span className="wb-text-muted wb-text-xs"> {user.tenant_name}</span>
      )}
    </>
  );
}
