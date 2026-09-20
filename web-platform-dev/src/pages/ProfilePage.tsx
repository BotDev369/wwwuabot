/**
 * Профіль у платформі — **хаб**: хто ти і куди ще можна піти.
 *
 * **Обліковий рядок, а не дані.** Людина приходить сюди не читати про себе —
 * вона приходить далі (у нотатки, контакти, тему). Тому хаб показує **один
 * рядок**: два фото (своє на платформі й те, що дає Telegram) і два імені
 * (`#karas` — наше, `@sergiy` — Telegram). Усе решта про акаунт живе на своїй
 * сторінці (`/profile/account`), і дублювати її тут означало б мати два екрани
 * з одним вмістом — саме через це хаб і був кашею.
 *
 * **Чому сторінка, а не поверхня.** Пункт футера мусить означати місце: дотик
 * до нього веде на адресу, яку видно в рядку браузера, пам'ятає історія і можна
 * надіслати посиланням, а «назад» вертає **звідси**, а не виходить із
 * застосунку. Слот, який просто відкриває модалку, — це кнопка, а не пункт.
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
import { ThemeSheet, UserAccountRow, formatPlatformUsername } from "@wwwuabot/shared";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { MenuList, buildMenuItems } from "@wwwuabot/ui/menu";
import { PROFILE_ACCOUNT_PATH } from "@/app/routes";
import { useProfile } from "./useProfile";
import { ProfileSectionsSwitch } from "./ProfileSectionsSwitch";
import { buildProfileSections, readSectionsLayout, writeSectionsLayout } from "./profile-sections";

export function ProfilePage(): ReactElement {
  const { profile, loading, error } = useProfile();
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

  // Заголовок — **ім'я на платформі**, а не ім'я з Telegram: друге ми не
  // обираємо й воно може зникнути. Поки імені немає, екран зветься своїм ім'ям.
  const title = formatPlatformUsername(profile?.platformUsername) ?? "Профіль";

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">{title}</h1>
        <ProfileSectionsSwitch layout={layout} onChange={changeLayout} />
      </div>

      <UserAccountRow
        user={profile}
        // Причину порожнечі каже сам рядок: інакше два круги без імен читались
        // би як поламане завантаження, а не як «даних ще немає».
        note={loading ? "Завантаження…" : error}
        onSelect={() => navigate(PROFILE_ACCOUNT_PATH)}
      />

      <MenuList items={items} layout={layout} />

      {themeOpen && <ThemeSheet onClose={() => setThemeOpen(false)} />}
    </div>
  );
}
