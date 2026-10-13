/**
 * «Користувачі» — люди, які самі відкрили свій профіль.
 *
 * **Це екран, а не вкладка.** Стрічку відкривають зі «Сервісів» (або власною
 * адресою `/users`), тож вона лише показує список: окремої адреси під саму
 * людину немає — картка стоїть у стрічці, а не веде на другу поверхню.
 *
 * @module web-platform-dev/src/pages/UsersPage
 */

import type { ReactElement } from "react";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { UsersList } from "./UsersList";
import { usePublicUsers } from "./usePublicUsers";

export function UsersPage(): ReactElement {
  useScreenChrome({ title: "Користувачі" });
  const users = usePublicUsers();

  return (
    <div className="wb-page">
      <UsersList
        items={users.items}
        loading={users.loading}
        error={users.error}
        onRetry={users.reload}
      />
    </div>
  );
}
