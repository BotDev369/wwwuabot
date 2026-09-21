/**
 * Профіль у платформі — **хаб про людину**: хто ти і як виглядає продукт.
 *
 * **Обліковий рядок, а не дані.** Людина приходить сюди не читати про себе —
 * вона приходить далі (у свій екран, у тему). Тому хаб показує **один рядок**:
 * два фото (своє на платформі й те, що дає Telegram) і два імені (`#karas` —
 * наше, `@sergiy` — Telegram). Усе решта про акаунт живе на своїй сторінці
 * (`/profile/account`), і дублювати її тут означало б мати два екрани з одним
 * вмістом — саме через це хаб і був кашею.
 *
 * **Інструментів тут більше немає.** Дати, Контакти, Локації, Нотатки й
 * Сторінки переїхали в хаб «Створити» (`/create`, слот «+» у футері): там у
 * кожного пункту два входи — подивитись і створити, — а профіль перестав бути
 * списком робочих місць, серед яких губився сам акаунт.
 *
 * **Чому сторінка, а не поверхня.** Пункт футера мусить означати місце: дотик
 * до нього веде на адресу, яку видно в рядку браузера, пам'ятає історія і можна
 * надіслати посиланням, а «назад» вертає **звідси**, а не виходить із
 * застосунку. Слот, який просто відкриває модалку, — це кнопка, а не пункт.
 *
 * **Тема — сторінка, а не поверхня.** Пункт «Тема» веде на `/profile/theme`:
 * у розділу є свої сторінки (стиль, готові теми, свої схеми, публічні,
 * налаштування), а модалка не мала ні історії, ні «назад», ні посилання —
 * тобто не давала повернутись до збереженої схеми (AGENTS.md §8).
 *
 * @module web-platform-dev/src/pages/ProfilePage
 */

import type { ReactElement } from "react";
import { UserAccountRow } from "@wwwuabot/shared";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { MenuList, buildMenuItems } from "@wwwuabot/ui/menu";
import { PROFILE_ACCOUNT_PATH, THEME_PATH } from "@/app/routes";
import { useProfile } from "./useProfile";
import { buildProfileSections } from "./profile-sections";

export function ProfilePage(): ReactElement {
  const { profile, loading, error } = useProfile();
  const navigate = useNavigate();
  const dialog = useDialog();

  const items = buildMenuItems({
    items: buildProfileSections({ onOpenTheme: () => navigate(THEME_PATH) }),
    // Перехід у межах SPA: повне перезавантаження в TWA — це втрачений стан і
    // біла вспишка.
    navigate: (href) => navigate(href),
    onPlaceholder: (item) => {
      // Заглушка не мовчить: у пункту вже є пояснення, що там буде, і саме
      // його показує діалог — без вигаданого тексту на місці (§7).
      void dialog.alert(item.hint ?? `Розділ «${item.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        {/* Заголовок — **ім'я екрана**, а не ім'я людини: те саме слово, що в
            пункті футера. Ім'я на платформі й Telegram-юзернейм уже стоять у рядку
            акаунта — поруч, парою, де вони й читаються як імена, а не як назва
            місця. */}
        <h1 className="wb-page-title">Профіль</h1>
      </div>

      <UserAccountRow
        user={profile}
        // Причину порожнечі каже сам рядок: інакше два круги без імен читались
        // би як поламане завантаження, а не як «даних ще немає».
        note={loading ? "Завантаження…" : error}
        onSelect={() => navigate(PROFILE_ACCOUNT_PATH)}
      />

      <MenuList items={items} />
    </div>
  );
}
