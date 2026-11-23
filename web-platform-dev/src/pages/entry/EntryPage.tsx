/**
 * Головна — обкладинка й меню: на обкладинці назва, нижче самі пункти картками
 * без підписів груп (як у Tribute). Поки `/api/screens` не відповів, меню йде
 * з реєстру. Розкладка — `docs/DESIGN_AGREED.md`, розділ 4а.
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

/** Тон плитки рядка: голос із палітри даних, а не колір у коді. */
const TONES: Record<string, number> = {
  day: 3,
  analysis: 4,
  trackers: 2,
  notes: 6,
  shops: 1,
  orders: 5,
  favorites: 5,
  users: 2,
  messages: 4,
  contacts: 6,
  ads: 3,
  games: 5,
  research: 4,
  services: 6,
  account: 3,
};

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

      <div className="wb-showcase-groups">
        {groups.map((group) => (
          <section className="wb-showcase-group" key={group.key}>
            <ul className="wb-showcase-list">
              {group.items.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="wb-showcase-row"
                    onClick={() => void navigate(item.href)}
                  >
                    <span
                      className="wb-showcase-row-icon"
                      data-tone={TONES[item.key] ?? 1}
                      aria-hidden="true"
                    >
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
