/**
 * Меню профілю в платформі — те, що відкриває «Профіль» у футері.
 *
 * Склад пунктів знає `profile-menu.ts`, поверхню — спільний `MenuModal`
 * (`@wwwuabot/ui/menu`), а цей компонент їх зводить: вирішує, котрий **вид**
 * показати (список розділів чи панель теми), куди веде дотик і що сказати на
 * пункт-заглушку.
 *
 * Панель теми — той самий вид, а не друга модалка: «назад» у шапці вертає до
 * списку, і жодна поверхня не висіла над іншою. Сама панель — теж спільна
 * (`ThemeColorPanel` з `@wwwuabot/shared`), той самий вибір трьох кольорів, що
 * й у кнопці «Тема» в адмінці, тож факт один.
 *
 * @module web-platform-dev/src/layout/ProfileMenu
 */

import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeColorPanel } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";
import { MenuModal, buildMenuItems } from "@wwwuabot/ui/menu";
import { useProfile } from "@/pages/useProfile";
import { ProfileIdentityRow } from "./ProfileIdentityRow";
import { PROFILE_PATH } from "./platform-tabs";
import { buildProfileItems, type ProfileMenuView } from "./profile-menu";

interface ProfileMenuProps {
  /** Закрити меню. Відкриває й закриває його футер. */
  onClose: () => void;
}

const TITLES: Record<ProfileMenuView, string> = {
  list: "Профіль",
  theme: "Тема",
};

export function ProfileMenu({ onClose }: ProfileMenuProps): ReactElement {
  const navigate = useNavigate();
  const dialog = useDialog();
  const { profile, loading } = useProfile();
  const [view, setView] = useState<ProfileMenuView>("list");

  const items = buildMenuItems({
    items: buildProfileItems({ onOpenTheme: () => setView("theme") }),
    // Перехід закриває меню: воно належить футеру, а не екрану, на який веде
    // — інакше модалка лишилась би висіти над зовсім іншою сторінкою.
    navigate: (href) => {
      onClose();
      navigate(href);
    },
    onPlaceholder: (item) => {
      // Заглушка не мовчить: у пункту вже є пояснення, що там буде, і саме
      // його показує діалог — без вигаданого тексту на місці (§7).
      void dialog.alert(item.hint ?? `Розділ «${item.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  return (
    <MenuModal
      title={TITLES[view]}
      items={view === "theme" ? [] : items}
      // Панель теми замінює список: це та сама поверхня, лише зі своїм вмістом
      // (світлої / темної більше немає, а три кольори — не пункт меню).
      content={view === "theme" ? <ThemeColorPanel onClose={onClose} /> : undefined}
      onClose={onClose}
      // «Назад» є лише там, звідки є куди вертатись: у списку розділів його
      // немає, бо це корінь меню.
      onBack={view === "theme" ? () => setView("list") : undefined}
      // Картка «хто ти» — тільки в списку: у панелі теми вона займала б місце
      // й не мала б до неї жодного стосунку.
      header={
        view === "list" ? (
          <ProfileIdentityRow
            user={profile}
            loading={loading}
            onOpen={() => {
              onClose();
              navigate(PROFILE_PATH);
            }}
          />
        ) : undefined
      }
    />
  );
}
