/**
 * «З простору» — вкладка готових тем: те, чим поділилися інші.
 *
 * **Те саме, що видно в Просторі.** Тема, яку людина відкрила, з'являється тут
 * і у вкладці «Теми» Простору — це одна вибірка з однієї таблиці, тож другого
 * списку з тими самими темами не існує.
 *
 * **Чужу тему можна лише взяти собі.** Змінювати й прибирати чужу не можна, і
 * кнопок під неї тут немає: показувати дію, яка гарантовано не працює, — це
 * обіцянка, а не дія (AGENTS.md §7).
 *
 * @module web-platform-dev/src/pages/themes/SharedThemesPanel
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { SchemeList } from "./SchemeList";
import { themeSectionPath } from "./theme-sections";
import { useAppliedScheme } from "./useAppliedScheme";
import { useSharedThemes } from "./useSharedThemes";

export function SharedThemesPanel(): ReactElement {
  const themes = useSharedThemes();
  const { applied, apply } = useAppliedScheme();
  const navigate = useNavigate();

  return (
    <SchemeList
      items={themes.items}
      loading={themes.loading}
      error={themes.error}
      onRetry={() => themes.reload(true)}
      applied={applied}
      onApply={apply}
      empty={{
        icon: "globe",
        title: "Поки ніхто не поділився темою.",
        hint: "Свою можна відкрити в «Налаштувати тему» — перемикач «Доступна публічно».",
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
  );
}
