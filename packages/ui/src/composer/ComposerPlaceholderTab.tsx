/**
 * Вкладка-заглушка: «тут буде», а не порожній екран.
 *
 * Скільки вкладок не додай, усі вони спершу виглядають однаково — тому це
 * один компонент, а не копія в кожній вкладці. Показує підпис, іконку, що
 * саме тут буде, і список запланованого з `tabs.ts`.
 *
 * @module @wwwuabot/ui/composer
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { ComposerTab } from "./types";

export function ComposerPlaceholderTab({ tab }: { tab: ComposerTab }): ReactElement {
  return (
    <div className="wb-empty wb-composer-soon">
      <span className="wb-empty-icon">
        <Icon name="construction" size={32} />
      </span>
      <h3 className="wb-composer-soon-title">«{tab.label}» — у роботі</h3>
      {tab.hint && <p className="wb-composer-soon-text">{tab.hint}</p>}
      {tab.planned && tab.planned.length > 0 && (
        <ul className="wb-composer-plan">
          {tab.planned.map((item) => (
            <li key={item} className="wb-composer-plan-item">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
