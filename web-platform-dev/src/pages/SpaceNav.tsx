/**
 * Бічна панель розділів Простору.
 *
 * **Вкладки переїхали в панель.** Смуга зверху показувала підписи всіх розділів
 * завжди — і забирала в списку цілий рядок, а на телефоні ще й прокручувалась
 * набік. Панель лишає вибір на видноті постійно й читається **стовпчиком**:
 * знак і слово в один рядок, тож пункт упізнають з одного погляду.
 *
 * **Розгорнута — для вибору, згорнута — для роботи.** Розгорнута панель показує
 * знак **і підпис** (так обирають), згорнута — тільки знак (так читають вміст).
 * Обраний пункт видно в обох станах, і знак для нього один — **акцент**: у
 * розгорнутій це плишка, у смузі знаків — колір і товщий штрих знака, як у
 * футері (`space-nav.css`).
 *
 * **Розмітка — кирпичики `.wb-nav*`** (`app-chrome.css`), той самий, що бічне
 * меню адмінки: згортання, активний пункт і знак уже описані там, і другий
 * такий набір класів розійшовся б із першим першою ж правкою (AGENTS.md §3).
 * Тут лишається рівно те, чим панель Простору відрізняється: вона стоїть
 * **усередині сторінки** (тому `.wb-space-*` у `styles/space-nav.css`), склад
 * пунктів бере з `SPACE_TABS`, а знаки — з їхнього поля `icon`.
 *
 * @module web-platform-dev/src/pages/SpaceNav
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import { SPACE_TABS, type SpaceTab } from "./space-tabs";

interface SpaceNavProps {
  /** Панель розгорнута: у пунктів є підписи. */
  expanded: boolean;
  /** Обраний розділ — він підсвічений акцентом. */
  value: SpaceTab;
  /** Вибір розділу: панель після нього згортається (`useSpaceNav`). */
  onSelect: (key: SpaceTab) => void;
  /** Розгорнути / згорнути панель, не змінюючи розділ. */
  onToggle: () => void;
}

export function SpaceNav({ expanded, value, onSelect, onToggle }: SpaceNavProps): ReactElement {
  const action = expanded ? "Згорнути панель розділів" : "Розгорнути панель розділів";

  return (
    <aside className={`wb-nav wb-space-nav${expanded ? "" : " wb-nav--collapsed"}`}>
      <div className="wb-nav-header">
        {expanded && <span className="wb-nav-title">Розділи</span>}
        <button
          type="button"
          className="wb-nav-toggle"
          onClick={onToggle}
          title={action}
          aria-label={action}
          aria-expanded={expanded}
        >
          <Icon name="sidebar-toggle" size={18} />
        </button>
      </div>

      {/* `role="tablist"` і пара `tabId` / `tabPanelId` — ті самі, що в горизонтальної
          смуги (`@wwwuabot/ui/tabs`): вміст розділу на сторінці позначений ними ж,
          тож зв'язок «пункт ↔ панель» лишається один, а не два. */}
      <nav
        className="wb-nav-menu"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Розділи простору"
      >
        {SPACE_TABS.map((tab) => {
          const active = tab.key === value;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={active}
              aria-controls={tabPanelId(tab.key)}
              // Згорнута панель підпису не показує, тож ім'я пункту мусить
              // лишитись хоч десь: підказка на дотик і читач з екрана.
              title={expanded ? undefined : tab.label}
              className={`wb-nav-item${active ? " wb-nav-item--active" : ""}`}
              onClick={() => onSelect(tab.key)}
            >
              <span className="wb-nav-icon">
                <Icon name={tab.icon} size={20} />
              </span>
              {expanded && <span className="wb-nav-label">{tab.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
