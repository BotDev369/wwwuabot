/**
 * Нижній футер платформи.
 *
 * Тут лише те, чим платформа відрізняється від адмінки: її пункти, її роутер
 * і її реакція на пункт-заглушку. Сама смуга — спільний `TabBar`.
 *
 * **Кожен слот — адреса.** Доти «+» був єдиним винятком: він відкривав
 * композер поверхні, тож у нього не було ні історії, ні «назад», ні
 * посилання. Тепер «+» веде на `/create` — хаб власних екранів людини, а
 * створення відкриває **сам екран**, який його вміє (нотатки — композером,
 * повідомлення — формою листа, дошка — вкладкою «Оголошення»). Тому композера
 * тут більше немає: смуга лишається хромом і нічого не тримає над сторінкою.
 *
 * Смуга видима й на екрані, який щось відкрив поверх себе (`--z-tabbar`), тож
 * перехід на інший розділ закриває те, що було відкрито: інакше форма висіла б
 * над зовсім іншою сторінкою.
 *
 * @module web-platform-dev/src/layout/PlatformTabBar
 */

import type { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TabBar, buildTabBarItems } from "@wwwuabot/ui/nav";
import { PLATFORM_TABS, toShellTabs, withUnreadBadge } from "./platform-tabs";
import { useUnreadBadge } from "./useUnreadBadge";

export function PlatformTabBar(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialog = useDialog();
  const unread = useUnreadBadge();

  const items = buildTabBarItems({
    tabs: toShellTabs(PLATFORM_TABS),
    pathname,
    navigate: (href) => navigate(href),
    // Заглушок у смузі немає (стереже `platform-tabs.test.ts`), але слот без
    // адреси мусить сказати про це вголос, а не мовчати дотиком: обробник тут
    // — саме для того випадку, який колись з'явиться.
    onPlaceholder: (tab) => {
      void dialog.alert(`Розділ «${tab.label}» ще в розробці.`, { title: "Скоро" });
    },
  });
  // Число непрочитаних — окремим кроком і чистою функцією: без неї «котрий
  // пункт несе позначку» було б розкидано по розмітці смуги.
  const tabs = withUnreadBadge(items, unread);

  return <TabBar items={tabs} label="Навігація платформи" />;
}
