/**
 * Нижній футер платформи.
 *
 * Тут лише те, чим платформа відрізняється від адмінки: її пункти, її роутер
 * і її реакція на пункт-заглушку. Сама смуга — спільний `TabBar`.
 *
 * Центральний «+» відкриває спільний композер: «створити» — це дія, а не
 * розділ, і адреси під нею немає.
 *
 * Смуга лишається видимою й робочою навіть з відкритою модалкою (футер — хром,
 * `--z-tabbar`), тому перехід на інший розділ закриває композер: інакше модалка
 * «Створити» висіла б над зовсім іншою сторінкою.
 *
 * @module web-platform-dev/src/layout/PlatformTabBar
 */

import { useState, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TabBar, buildTabBarItems, withPrimaryAction } from "@wwwuabot/ui/nav";
import { notesApi } from "../shared/api/notes.api";
import { PLATFORM_TABS, toShellTabs } from "./platform-tabs";

export function PlatformTabBar(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialog = useDialog();
  const [composerOpen, setComposerOpen] = useState(false);

  const items = buildTabBarItems({
    // «+» — перемикач: той самий слот закриває композер, якщо він уже відкритий
    tabs: withPrimaryAction(toShellTabs(PLATFORM_TABS), () => setComposerOpen((open) => !open)),
    pathname,
    navigate: (href) => {
      setComposerOpen(false);
      navigate(href);
    },
    onPlaceholder: (tab) => {
      void dialog.alert(`Розділ «${tab.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  return (
    <>
      <TabBar items={items} label="Навігація платформи" />
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
