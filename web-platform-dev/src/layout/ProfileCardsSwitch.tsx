/**
 * Перемикач розкладки карток — сегментована смуга з двох варіантів.
 *
 * Стоїть у смузі внизу меню профілю (`MenuModal` → `footer`), ліворуч від
 * «закрити»: це вибір вигляду, тож він має бути там, де рука, і **видно** мають
 * бути обидва варіанти одразу — на відміну від решти виборів продукту, які
 * відкривають повноекранний список (`MenuModal`). Другий варіант тут рівно
 * один, і відкривати заради нього поверхню над поверхнею було б гірше.
 *
 * **Тільки знаки, без підписів.** У смузі сегмент ділить місце з «закрити», і
 * два підписи трьома рядами з'їдали б половину екрана, а знак варіант читає за
 * формою («рядки» — три риски, «стовпці» — картка). Ім'я при цьому не губиться:
 * воно в `aria-label` і `title`, а самі варіанти приходять із `CARDS_LAYOUT_OPTIONS`.
 *
 * @module web-platform-dev/src/layout/ProfileCardsSwitch
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { MenuCardsLayout } from "@wwwuabot/ui/menu";
import { CARDS_LAYOUT_OPTIONS } from "./profile-cards-pref";

interface ProfileCardsSwitchProps {
  layout: MenuCardsLayout;
  onChange: (layout: MenuCardsLayout) => void;
}

export function ProfileCardsSwitch({ layout, onChange }: ProfileCardsSwitchProps): ReactElement {
  return (
    <div className="wb-segmented" role="group" aria-label="Вигляд карток">
      {CARDS_LAYOUT_OPTIONS.map((option) => {
        const active = option.key === layout;
        return (
          <button
            key={option.key}
            type="button"
            className={`wb-segmented-btn${active ? " wb-segmented-btn--active" : ""}`}
            aria-label={option.label}
            aria-pressed={active}
            title={option.label}
            onClick={() => onChange(option.key)}
          >
            <Icon name={option.icon} size={18} />
          </button>
        );
      })}
    </div>
  );
}
