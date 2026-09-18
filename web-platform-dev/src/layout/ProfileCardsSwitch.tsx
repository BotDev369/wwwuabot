/**
 * Перемикач розкладки облікових карток — сегментована смуга з двох варіантів.
 *
 * Стоїть у смузі внизу меню профілю (`MenuModal` → `footer`), ліворуч від
 * «закрити»: це вибір вигляду, тож він має бути там, де рука, і **видно** мають
 * бути обидва варіанти одразу — на відміну від решти виборів продукту, які
 * відкривають повноекранний список (`MenuModal`). Другий варіант тут рівно
 * один, і відкривати заради нього поверхню над поверхнею було б гірше.
 *
 * Знаки різні навмисно (`card` / `list`): однакові не сказали б, чим варіанти
 * різняться. Підпис сегмента на вузькому екрані ховається (його місце ділить
 * «закрити»), тому кожен сегмент має `aria-label` і `title`.
 *
 * @module web-platform-dev/src/layout/ProfileCardsSwitch
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { ACCOUNT_LAYOUT_OPTIONS, type AccountCardsLayout } from "./profile-account";

interface ProfileCardsSwitchProps {
  layout: AccountCardsLayout;
  onChange: (layout: AccountCardsLayout) => void;
}

export function ProfileCardsSwitch({ layout, onChange }: ProfileCardsSwitchProps): ReactElement {
  return (
    <div className="wb-segmented" role="group" aria-label="Вигляд карток">
      {ACCOUNT_LAYOUT_OPTIONS.map((option) => {
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
            <Icon name={option.icon} size={16} />
            <span className="wb-segmented-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
