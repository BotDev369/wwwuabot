/**
 * Профіль у платформі — **хаб**: хто ти і куди ще можна піти.
 *
 * Це той самий екран, що в адмінці — спільний `UserProfileCard` зі
 * `@wwwuabot/shared`; різниця лише в даних (платформа має підписаний
 * `initData`, тому показує все, що Telegram віддав тут і зараз, і має право
 * змінити **своє** ім'я на платформі) і в тому, що нижче додає сама оболонка.
 *
 * **Чому сторінка, а не поверхня.** Пункт футера мусить означати місце:
 * дотик до нього веде на адресу, яку видно в рядку браузера, пам'ятає історія
 * і можна надіслати посиланням, а «назад» вертає **звідси**, а не виходить із
 * застосунку. Слот, який просто відкриває модалку, — це кнопка, а не пункт
 * (адмінка робить саме так, і тепер обидві оболонки роблять однаково).
 *
 * **Розділи** (Контакти, Локації, Нотатки, Сторінки, Тема) — те, чого немає в
 * футері: у платформи немає бічного меню, і без цього списку власні екрани
 * людини були б недосяжні. Показує їх спільний `MenuList` — та сама розмітка
 * пункту, що в будь-якій поверхні продукту.
 *
 * **Панель теми** відкривається звідси спільним `ThemeSheet`: у ту саму
 * поверхню, що й в адмінки, — щоб «вибір трьох кольорів» існував в одному
 * місці, а не в двох схожих.
 *
 * @module web-platform-dev/src/pages/ProfilePage
 */

import { useState, type ReactElement } from "react";
import { ThemeSheet, UserProfileCard, type UserProfileData } from "@wwwuabot/shared";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { MenuList, buildMenuItems } from "@wwwuabot/ui/menu";
import { useProfile } from "./useProfile";
import { ProfileSectionsSwitch } from "./ProfileSectionsSwitch";
import { buildProfileSections, readSectionsLayout, writeSectionsLayout } from "./profile-sections";

/** Порожній профіль — для станів завантаження й помилки (картка їх розрізняє). */
const EMPTY_PROFILE: UserProfileData = { id: 0 };

export function ProfilePage(): ReactElement {
  const { profile, loading, error, saveUsername } = useProfile();
  const navigate = useNavigate();
  const dialog = useDialog();
  const [themeOpen, setThemeOpen] = useState(false);
  // Вибір вигляду лежить у сховищі пристрою: екран перемонтовується на
  // кожному переході, і стан компонента скидався б.
  const [layout, setLayout] = useState(readSectionsLayout);

  function changeLayout(next: typeof layout): void {
    setLayout(next);
    writeSectionsLayout(next);
  }

  const items = buildMenuItems({
    items: buildProfileSections({ onOpenTheme: () => setThemeOpen(true) }),
    // Перехід у межах SPA: повне перезавантаження в TWA — це втрачений стан і
    // біла вспишка.
    navigate: (href) => navigate(href),
    onPlaceholder: (item) => {
      // Заглушка не мовчить: у пункту вже є пояснення, що там буде, і саме
      // його показує діалог — без вигаданого тексту на місці (§7).
      void dialog.alert(item.hint ?? `Розділ «${item.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  const title = profile?.platformUsername
    ? `@${profile.platformUsername}`
    : (profile?.firstName ?? "Профіль");

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">{loading ? "Профіль" : title}</h1>
        <ProfileSectionsSwitch layout={layout} onChange={changeLayout} />
      </div>

      <UserProfileCard
        user={profile ?? EMPTY_PROFILE}
        variant="platform"
        loading={loading}
        error={error}
        onChangeUsername={saveUsername}
      />

      <MenuList items={items} layout={layout} />

      {themeOpen && <ThemeSheet onClose={() => setThemeOpen(false)} />}
    </div>
  );
}
