import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { buildMenuItems, type MenuLayout } from "@wwwuabot/ui/menu";
import { PROFILE_ACCOUNT_PATH, PROFILE_ORDERS_PATH, THEME_PATH } from "@/app/routes";
import { useProfile } from "./useProfile";
import { useUserPages } from "./user-pages/useUserPages";
import { useContactAdd } from "./create/useContactAdd";
import type { CreateSheetKey } from "./create/CreateSheetHost";
import { buildHubItems } from "./create-hub";
import { buildProfileSections } from "./profile-sections";
import { readSectionsLayout, writeSectionsLayout } from "./section-layout";

/** Стан і дії I: акаунт, власні розділи та створення без переходу з хабу. */
export function usePersonalHub() {
  const { profile, loading, error } = useProfile();
  const { pages } = useUserPages();
  const navigate = useNavigate();
  const dialog = useDialog();
  const contact = useContactAdd();
  const [layout, setLayout] = useState(readSectionsLayout);
  const [sheet, setSheet] = useState<CreateSheetKey | null>(null);

  const sections = buildMenuItems({
    items: buildProfileSections({
      onOpenTheme: () => navigate(THEME_PATH),
      onOpenOrders: () => navigate(PROFILE_ORDERS_PATH),
      hasShops: pages.some((page) => page.template === "shop"),
    }),
    navigate: (href) => navigate(href),
    onPlaceholder: (item) => {
      void dialog.alert(item.hint ?? `Розділ «${item.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  const items = buildHubItems({
    navigate: (href, options) => navigate(href, options),
    onForm: (form) => {
      if (form === "contact") {
        void contact.add();
        return;
      }
      setSheet(form);
    },
    onSoon: (message) => void dialog.alert(message, { title: "Скоро" }),
  });

  function changeLayout(next: MenuLayout): void {
    setLayout(next);
    writeSectionsLayout(next);
  }

  return {
    profile,
    note: loading ? "Завантаження…" : error,
    sections,
    items,
    layout,
    changeLayout,
    sheet,
    closeSheet: () => setSheet(null),
    openAccount: () => void navigate(PROFILE_ACCOUNT_PATH),
  };
}
