import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app.store";
import { apiFetch } from "@/shared/api/client";
import { UserProfileCard, type UserProfileData } from "@wwwuabot/shared";

function getTgUser() {
  try {
    const tg = window.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user ?? null;
  } catch {
    return null;
  }
}

export function ProfilePage() {
  const setScenarioName = useAppStore((s) => s.setScenarioName);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScenarioName("Профіль");
  }, [setScenarioName]);

  useEffect(() => {
    const tgUser = getTgUser();

    // Build base profile from TWA data
    const baseProfile: UserProfileData = {
      id: tgUser?.id ?? 0,
      firstName: tgUser?.first_name,
      lastName: tgUser?.last_name,
      username: tgUser?.username,
      language: tgUser?.language_code,
      photoUrl: tgUser?.photo_url,
      isPremium: tgUser?.is_premium,
      isBot: tgUser?.is_bot,
      addedToMenu: tgUser?.added_to_attachment_menu,
    };

    if (tgUser?.id) {
      apiFetch<{ ok: boolean; user?: Record<string, unknown> }>(`/api/user/profile?user_id=${tgUser.id}`)
        .then((res) => {
          if (res.ok && res.user) {
            const u = res.user;
            setProfile({
              ...baseProfile,
              role: u.role as string,
              tariff: u.tariff as string,
              status: u.status as string,
              discount: u.discount as number,
              permissions: u.permissions as string[],
            });
          } else {
            setProfile(baseProfile);
          }
        })
        .catch((e) => {
          setError(`Помилка завантаження профілю: ${String(e).slice(0, 100)}`);
          setProfile(baseProfile);
        })
        .finally(() => setLoading(false));
    } else {
      setProfile(baseProfile);
      setLoading(false);
    }
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="page-header">
          <h1>Профіль</h1>
        </div>

        <UserProfileCard
          user={profile!}
          variant="platform"
          loading={loading}
          error={error}
        />
      </section>
    </main>
  );
}
