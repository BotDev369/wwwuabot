/**
 * Друга смуга футера платформи — **лише всередині теми**.
 *
 * Тема — єдиний розділ, у якого є власні сторінки (стиль, свої схеми, спільна
 * бібліотека, налаштування), тож саме тут з'явилась друга смуга. Перша смуга
 * веде між розділами продукту, друга — між сторінками одного з них; змішати їх
 * в одному ряду означало б, що «Головна» й «Шрифт» стоять поруч як рівні.
 *
 * Кирпичик (`SubBar`) спільний: та сама смуга знадобиться будь-якому розділу,
 * який обросте сторінками, і тоді тут не буде жодної нової розмітки.
 *
 * @module web-platform-dev/src/layout/ThemeSubBar
 */

import type { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { SubBar, buildSubBarItems } from "@wwwuabot/ui/nav";
import { THEME_QUICK_SECTIONS, themeSectionPath } from "../pages/themes/theme-sections";

export function ThemeSubBar(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialog = useDialog();

  const items = buildSubBarItems({
    items: THEME_QUICK_SECTIONS.map((section) => ({
      key: section.key,
      label: section.label,
      icon: section.icon,
      href: themeSectionPath(section.key),
    })),
    pathname,
    navigate: (href) => navigate(href),
    // Заглушок у смузі немає, але пункт без адреси мусить сказати про це
    // вголос, а не мовчати дотиком — як у головній смузі.
    onPlaceholder: (item) => {
      void dialog.alert(`Розділ «${item.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  return <SubBar items={items} label="Розділи теми" />;
}
