/**
 * Головна — обкладинка й меню: на обкладинці назва, нижче самі пункти картками
 * без підписів груп (як у Tribute). Поки `/api/screens` не відповів, меню йде
 * з реєстру. Розкладка — `docs/DESIGN_AGREED.md`, розділ 4а.
 *
 * Список розділів тут — той самий `PlatformNavList`, що й у меню: одне джерело,
 * два місця відображення.
 *
 * @module web-platform-dev/src/pages/entry/EntryPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { SCREENS, type ScreenRow } from "@wwwuabot/shared/screens";
import { PlatformNavList } from "@/layout/PlatformNavList";
import { platformNav } from "@/layout/screen-nav";
import { useScreens } from "@/layout/useScreens";

/** Реєстр у формі рядків: та сама форма, що приходить із `/api/screens`. */
const REGISTRY_ROWS: readonly ScreenRow[] = SCREENS.map((screen) => ({
  key: screen.key,
  parentKey: screen.parent,
  title: screen.title,
  icon: screen.icon,
  sortOrder: screen.sort,
  inMenu: screen.inMenu,
  texts: {},
}));

export function EntryPage(): ReactElement {
  const navigate = useNavigate();
  const { rows } = useScreens();
  const groups = platformNav(rows.length > 0 ? rows : REGISTRY_ROWS, "/");

  return (
    <main className="wb-showcase">
      <section className="wb-showcase-hero">
        <img className="wb-showcase-photo" src="/media/home-hero.jpg" alt="" />
        <div className="wb-showcase-brand">
          <h1 className="wb-showcase-title">ПАЛЯНИЦЯ</h1>
          <p className="wb-showcase-tagline">платформа для своїх</p>
        </div>
      </section>

      <PlatformNavList groups={groups} onNavigate={(href) => void navigate(href)} />
    </main>
  );
}
