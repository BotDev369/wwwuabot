/**
 * `/profile/theme/public` — спільна бібліотека: схеми, якими поділилися інші.
 *
 * **Те саме, що видно в Просторі.** Схема, яку людина відкрила, з'являється
 * тут і у вкладці «Теми» Простору — це одна вибірка з однієї таблиці, тож
 * другого списку з тими самими схемами не існує.
 *
 * **Чужу схему можна лише взяти собі.** Змінювати й прибирати чужу не можна, і
 * кнопок під неї тут немає: показувати дію, яка гарантовано не працює, — це
 * обіцянка, а не дія (AGENTS.md §7).
 *
 * @module web-platform-dev/src/pages/themes/ThemePublicPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { SchemeList } from "./SchemeList";
import { themeSectionPath } from "./theme-sections";
import { useAppliedScheme } from "./useAppliedScheme";
import { useSharedThemes } from "./useSharedThemes";

export function ThemePublicPage(): ReactElement {
  const themes = useSharedThemes();
  const { applied, apply } = useAppliedScheme();
  const navigate = useNavigate();

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Публічні схеми</h1>
      </div>

      <p className="wb-text-muted">
        Схеми, які люди відкрили для всіх. Беріть собі будь-яку — вона одразу ляже на ваш екран.
      </p>

      <SchemeList
        items={themes.items}
        loading={themes.loading}
        error={themes.error}
        onRetry={() => themes.reload(true)}
        applied={applied}
        onApply={apply}
        empty={{
          icon: "globe",
          title: "Поки ніхто не поділився схемою.",
          hint: "Свою можна відкрити в «Налаштувати» — перемикач «Доступна публічно».",
          action: (
            <button
              className="wb-btn wb-btn-primary"
              onClick={() => navigate(themeSectionPath("customize"))}
            >
              <Icon name="edit" size={16} />
              До налаштувань
            </button>
          ),
        }}
      />
    </div>
  );
}
