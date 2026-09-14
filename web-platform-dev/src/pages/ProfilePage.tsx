/**
 * Профіль у платформі.
 *
 * Це **той самий** екран, що й у адмінці: рендерить спільний `UserProfileCard`
 * зі `@wwwuabot/shared`. Різниця лише в даних — платформа має підписаний
 * `initData` (тому показує все, що Telegram віддав тут і зараз) і право
 * змінити **своє** ім'я на платформі.
 *
 * Тут немає власного каркаса: `.wb-page*` — спільні кирпичики, а нижній футер
 * стоїть на рівні маршруту (`PlatformShell`), тож він лишається на місці.
 *
 * @module web-platform-dev/src/pages/ProfilePage
 */

import type { ReactElement } from "react";
import { UserProfileCard, type UserProfileData } from "@wwwuabot/shared";
import { useProfile } from "./useProfile";

/** Порожній профіль — для станів завантаження й помилки (картка їх розрізняє). */
const EMPTY_PROFILE: UserProfileData = { id: 0 };

export function ProfilePage(): ReactElement {
  const { profile, loading, error, saveUsername } = useProfile();

  const title = profile?.platformUsername
    ? `@${profile.platformUsername}`
    : (profile?.firstName ?? "Профіль");

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">{loading ? "Профіль" : title}</h1>
      </div>

      <UserProfileCard
        user={profile ?? EMPTY_PROFILE}
        variant="platform"
        loading={loading}
        error={error}
        onChangeUsername={saveUsername}
      />
    </div>
  );
}
