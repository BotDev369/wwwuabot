/**
 * Головна — обкладинка й меню в одному екрані.
 *
 * На фото — `ПАЛЯНИЦЯ` і «платформа для своїх», під ним те саме меню, що в
 * сайдбарі, але групами; поки `/api/screens` не відповів, групи йдуть з реєстру.
 *
 * @module web-platform-dev/src/pages/entry/EntryPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { SCREENS, type ScreenRow } from "@wwwuabot/shared/screens";
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
        <div className="wb-showcase-veil" aria-hidden="true" />
        <div className="wb-showcase-brand">
          <h1 className="wb-showcase-title">ПАЛЯНИЦЯ</h1>
          <p className="wb-showcase-tagline">платформа для своїх</p>
        </div>
      </section>

      <div className="wb-showcase-groups">
        {groups.map((group) => (
          <section className="wb-showcase-group" key={group.key}>
            {group.title === null ? null : (
              <h2 className="wb-showcase-group-title">{group.title}</h2>
            )}
            <ul className="wb-showcase-list">
              {group.items.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="wb-showcase-row"
                    onClick={() => void navigate(item.href)}
                  >
                    <span className="wb-showcase-row-icon" aria-hidden="true">
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="wb-showcase-row-label">{item.label}</span>
                    <span className="wb-showcase-row-more" aria-hidden="true">
                      <Icon name="chevron-right" size={18} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
