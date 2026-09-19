/**
 * Нижній футер платформи.
 *
 * Тут лише те, чим платформа відрізняється від адмінки: її пункти, її роутер
 * і її реакція на пункт-заглушку. Сама смуга — спільний `TabBar`.
 *
 * Два пункти не ведуть на адресу, а відкривають поверхню: центральний «+» —
 * композер, «Профіль» — меню профілю (`@wwwuabot/ui/composer` і
 * `@wwwuabot/ui/menu`). «Створити» — це дія, а сторінки під нею немає, а
 * профіль — меню розділів, а не екран: і те, і те відкривається поверх
 * поточного місця, не змушуючи йти з нього.
 *
 * Смуга лишається видимою й робочою навіть з відкритою модалкою (футер — хром,
 * `--z-tabbar`), тому перехід на інший розділ закриває обидві поверхні: інакше
 * модалка «Створити» висіла б над зовсім іншою сторінкою.
 *
 * @module web-platform-dev/src/layout/PlatformTabBar
 */

import { useState, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TabBar, buildTabBarItems, withAction, withPrimaryAction } from "@wwwuabot/ui/nav";
import { notesApi } from "../shared/api/notes.api";
import { ProfileMenu } from "./ProfileMenu";
import { PLATFORM_TABS, PROFILE_TAB_KEY, toShellTabs, withUnreadBadge } from "./platform-tabs";
import { useUnreadBadge } from "./useUnreadBadge";

export function PlatformTabBar(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialog = useDialog();
  const unread = useUnreadBadge();
  const [composerOpen, setComposerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /** Будь-який перехід закриває обидві поверхні: вони належать футеру, а не екрану. */
  const go = (href: string) => {
    setComposerOpen(false);
    setProfileOpen(false);
    navigate(href);
  };

  const items = buildTabBarItems({
    tabs: withPrimaryAction(
      // «Профіль» — перемикач, як і «+»: той самий пункт закриває меню.
      withAction(toShellTabs(PLATFORM_TABS), PROFILE_TAB_KEY, () =>
        setProfileOpen((open) => !open),
      ),
      () => setComposerOpen((open) => !open),
    ),
    pathname,
    navigate: go,
    onPlaceholder: (tab) => {
      void dialog.alert(`Розділ «${tab.label}» ще в розробці.`, { title: "Скоро" });
    },
  }).map((item) =>
    // Активний стан профілю рахуємо від меню, а не від адреси: у пункту її
    // немає (він не веде нікуди), але «я тут» показати треба — інакше смуга
    // мовчить про те, що поверх відкрита саме з неї.
    item.key === PROFILE_TAB_KEY ? { ...item, active: profileOpen } : item,
  );
  // Число непрочитаних — окремим кроком і чистою функцією: без неї «котрий
  // пункт несе позначку» було б розкидано по розмітці смуги.
  const tabs = withUnreadBadge(items, unread);

  return (
    <>
      <TabBar items={tabs} label="Навігація платформи" />
      {composerOpen && (
        <ComposerModal
          onClose={() => setComposerOpen(false)}
          onSaveNote={async (draft) => {
            await notesApi.save(draft);
          }}
        />
      )}
      {profileOpen && <ProfileMenu onClose={() => setProfileOpen(false)} />}
    </>
  );
}
