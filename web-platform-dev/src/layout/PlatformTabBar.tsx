/**
 * Нижній футер платформи.
 *
 * Тут лише те, чим платформа відрізняється від адмінки: її пункти, її роутер
 * і її реакція на пункт-заглушку. Сама смуга — спільний `TabBar`.
 *
 * **Лише «+» не веде на адресу.** Решта слотів — розділи, і кожен має
 * маршрут: перехід між ними — це навігація, тож «Профіль» веде на `/profile`
 * (як в адмінці), а не відкриває поверхню. «Створити» — дія: сторінки під нею
 * немає, вона виконується й закривається, і відкривається звідусіль.
 *
 * Смуга лишається видимою й робочою навіть з відкритим композером (футер —
 * хром, `--z-tabbar`), тому перехід на інший розділ його закриває: інакше
 * модалка «Створити» висіла б над зовсім іншою сторінкою.
 *
 * @module web-platform-dev/src/layout/PlatformTabBar
 */

import { useState, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TabBar, buildTabBarItems, withPrimaryAction } from "@wwwuabot/ui/nav";
import { notesApi } from "../shared/api/notes.api";
import { PLATFORM_TABS, toShellTabs, withUnreadBadge } from "./platform-tabs";
import { useUnreadBadge } from "./useUnreadBadge";

export function PlatformTabBar(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialog = useDialog();
  const unread = useUnreadBadge();
  const [composerOpen, setComposerOpen] = useState(false);

  /** Перехід закриває композер: він належить футеру, а не екрану. */
  const go = (href: string) => {
    setComposerOpen(false);
    navigate(href);
  };

  const items = buildTabBarItems({
    // «+» — перемикач: той самий слот закриває композер, якщо він уже відкритий
    tabs: withPrimaryAction(toShellTabs(PLATFORM_TABS), () => setComposerOpen((open) => !open)),
    pathname,
    navigate: go,
    onPlaceholder: (tab) => {
      void dialog.alert(`Розділ «${tab.label}» ще в розробці.`, { title: "Скоро" });
    },
  });
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
    </>
  );
}
