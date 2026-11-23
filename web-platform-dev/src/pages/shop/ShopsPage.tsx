/**
 * «Крамниці» — список відкритих крамниць: вхід, а не друга вітрина. Рядок
 * веде на ту саму сторінку (`/<slug>`), яку відкриває пряме посилання, а
 * відбір (відкритий, увімкнений, власник не заблокований) робить запит до бази
 * (`docs/SHOPS.md` §9, `docs/VISIBILITY.md`).
 *
 * @module web-platform-dev/src/pages/shop/ShopsPage
 */

import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import type { PublicShop } from "@wwwuabot/shared/shop";
import { MenuList, type MenuItem } from "@wwwuabot/ui/menu";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { shopApi } from "@/shared/api/shop.api";

interface ShopsState {
  shops: PublicShop[];
  loading: boolean;
  error: string | null;
}

export function ShopsPage(): ReactElement {
  useScreenChrome({ title: "Крамниці" });
  const navigate = useNavigate();
  const [state, setState] = useState<ShopsState>({ shops: [], loading: true, error: null });

  useEffect(() => {
    // `cancelled` — не формальність: екран закривають раніше, ніж прийде
    // відповідь, і без цієї перевірки стан оновлювався б у вже знятому дереві.
    let cancelled = false;

    shopApi
      .shops()
      .then((shops) => {
        if (cancelled) return;
        setState({ shops, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          shops: [],
          loading: false,
          error: e instanceof Error ? e.message : "Не вдалося завантажити крамниці",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="wb-page">
      {state.loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження крамниць…</p>
        </div>
      )}

      {!state.loading && state.error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{state.error}</p>
        </div>
      )}

      {!state.loading && !state.error && state.shops.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="cart" size={32} />
          </span>
          <p className="wb-empty-text">Відкритих крамниць ще немає.</p>
          <p className="wb-empty-text">
            Крамницю відкриває її власник: коли сторінку з каталогом оприлюднять, вона з'явиться
            тут.
          </p>
        </div>
      )}

      {!state.loading && !state.error && state.shops.length > 0 && (
        // Рядок малює спільний `MenuList`: власна копія розмітки розходилась би
        // з рештою списків продукту.
        <MenuList
          items={state.shops.map((shop): MenuItem => ({
            key: String(shop.id),
            label: shop.title,
            icon: "cart",
            trailing: true,
            onSelect: () => void navigate(`/${shop.slug}`),
          }))}
        />
      )}
    </div>
  );
}
