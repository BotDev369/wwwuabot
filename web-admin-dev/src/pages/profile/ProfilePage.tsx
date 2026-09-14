/**
 * Профіль в адмінці.
 *
 * Вигляд — той самий, що в платформі: спільні кирпичики `.wb-page*`, той самий
 * `UserProfileCard` зі `@wwwuabot/shared`. Різниця лише в логіці: тут вхід за
 * паролем (тож свого Telegram-профілю немає) і є вибір людини за ID.
 *
 * Сторінка скролиться сама — каркас панелі тримає `overflow: hidden`, і власну
 * прокрутку дає сторінка (`.wb-page-scroll`).
 *
 * @module web-admin-dev/src/pages/profile/ProfilePage
 */

import type { ReactElement } from "react";
import { PageTopbar } from "../../layout/PageTopbar";
import { AccountSection } from "./AccountSection";
import { UserLookupSection } from "./UserLookupSection";

export function ProfilePage(): ReactElement {
  return (
    <>
      <PageTopbar>
        <div className="wb-topbar-left">
          <h1 className="wb-topbar-title">Профіль</h1>
        </div>
      </PageTopbar>

      <div className="wb-page-scroll">
        <div className="wb-page">
          <AccountSection />
          <UserLookupSection />
        </div>
      </div>
    </>
  );
}
