/**
 * Сервіси — екран, куди веде третій пункт футера: **лише список**, де кожен
 * сервіс — окремий рядок-кнопка на свій екран (`MenuList`, як у решті списків продукту).
 *
 * @module web-platform-dev/src/pages/ServicesPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { MenuList, buildMenuItems } from "@wwwuabot/ui/menu";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { SERVICES } from "./services-list";

export function ServicesPage(): ReactElement {
  useScreenChrome({ title: "Сервіси" });
  const navigate = useNavigate();
  const dialog = useDialog();

  const items = buildMenuItems({
    items: SERVICES.map((service) => ({
      key: service.key,
      label: service.label,
      icon: service.icon,
      href: service.to,
      // Шеврон: за пунктом стоїть екран, а не дія на місці.
      trailing: true,
    })),
    navigate: (href) => navigate(href),
    // Заглушок у списку немає — усі адреси вже існують. Обробник лишається на
    // випадок, коли сервіс додадуть у дані раніше за екран: мовчазний дотик
    // гірший за чесне «ще не готово».
    onPlaceholder: (item) => {
      void dialog.alert(`Сервіс «${item.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  return (
    <div className="wb-page">
      <MenuList items={items} />
    </div>
  );
}
