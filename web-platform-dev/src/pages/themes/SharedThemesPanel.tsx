/**
 * «Публічні кольори» — вкладка пункту «Кольори теми»: те, чим поділилися інші.
 *
 * **Те саме, що видно в Просторі.** Тема, яку людина відкрила, з'являється тут
 * і у вкладці «Теми» Простору — це одна вибірка з однієї таблиці, тож другого
 * списку з тими самими темами не існує.
 *
 * **Чужу тему можна лише взяти собі.** Змінювати й прибрати чужу не можна, і
 * кнопок під нею тут немає: показувати дію, яка гарантовано не працює, — це
 * обіцянка, а не дія (AGENTS.md §7).
 *
 * @module web-platform-dev/src/pages/themes/SharedThemesPanel
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { ApplicableScheme } from "@wwwuabot/shared/themes/apply";
import { SchemeList } from "./SchemeList";
import type { AppliedLook } from "./useAppliedScheme";
import type { ThemeLibrary } from "./theme-library";

export interface SharedThemesPanelProps {
  list: ThemeLibrary;
  applied: AppliedLook;
  onApply: (scheme: ApplicableScheme) => void;
  onCreate: () => void;
}

export function SharedThemesPanel({
  list,
  applied,
  onApply,
  onCreate,
}: SharedThemesPanelProps): ReactElement {
  return (
    <SchemeList
      items={list.items}
      loading={list.loading}
      error={list.error}
      onRetry={() => list.reload(true)}
      applied={applied}
      onApply={onApply}
      empty={{
        icon: "globe",
        title: "Поки ніхто не поділився темою.",
        hint: "Свою можна відкрити тут — перемикач «Доступна публічно».",
        action: (
          <button className="wb-btn wb-btn-primary" onClick={onCreate}>
            <Icon name="edit" size={16} />
            Налаштувати власну
          </button>
        ),
      }}
    />
  );
}
