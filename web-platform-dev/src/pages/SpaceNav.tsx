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
 * Обраний пункт видно в обох станах, і знак для нього один — **акцент**, той
 * самий, що в меню адмінки й у футері.
 *
 * **Розмітку рендерить спільний `SideBar`** (`@wwwuabot/ui/nav`) — єдиний
 * типовий сайдбар продукту. Доти панель Простору ставила пункту свої мірки з
 * `!important`, щоб перекрити бренд: та сама деталь виглядала як дві різні.
 * Тут лишається рівно те, чим панель **відрізняється** — вона стоїть
 * **усередині сторінки**, а не хромом застосунку (сам`position` і ширину додає
 * `space-nav.css`), склад пунктів бере з `SPACE_TABS`, а роль смуги —
 * `tablist`: пункти й панель вмісту зв'язані тими самими `tabId` / `tabPanelId`,
 * що й у горизонтальної смуги.
 *
 * **Шапки в панелі немає.** Слово «Розділи» повторювало те, що й так видно зі
 * знаків і підписів, а рядок забирало справжнє — тож тумблер згортання поїхав
 * у шапку сторінки, поруч із її назвою (`SpacePage`): там він видно і в
 * згорнутому стані, а в панелі його місце займає перший пункт.
 *
 * @module web-platform-dev/src/pages/SpaceNav
 */

import type { ReactElement } from "react";
import { SideBar, SideBarMenu } from "@wwwuabot/ui/nav";
import { tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import { SPACE_TABS, type SpaceTab } from "./space-tabs";

interface SpaceNavProps {
  /** Панель розгорнута: у пунктів є підписи. */
  expanded: boolean;
  /** Обраний розділ — він підсвічений акцентом. */
  value: SpaceTab;
  /** Вибір розділу: панель після нього згортається (`useSpaceNav`). */
  onSelect: (key: SpaceTab) => void;
}

export function SpaceNav({ expanded, value, onSelect }: SpaceNavProps): ReactElement {
  return (
    <SideBar
      // Місце панелі — усередині сторінки; це і є єдина її відмінність.
      className="wb-space-nav"
      collapsed={!expanded}
    >
      <SideBarMenu
        collapsed={!expanded}
        label="Розділи простору"
        role="tablist"
        orientation="vertical"
        sections={[
          {
            key: "space",
            items: SPACE_TABS.map((tab) => {
              const active = tab.key === value;
              return {
                key: tab.key,
                label: tab.label,
                icon: tab.icon,
                active,
                role: "tab" as const,
                id: tabId(tab.key),
                panelId: tabPanelId(tab.key),
                onSelect: () => onSelect(tab.key),
              };
            }),
          },
        ]}
      />
    </SideBar>
  );
}
