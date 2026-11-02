/**
 * `ThemeColorPanel` — панель вигляду: вибір однієї з тем продукту.
 *
 * **Панель — це галерея, а не редактор.** Тем не збирають із кольорів: їх
 * малює дизайн-система, а людина вибирає настрій. Тому тут немає ні рядків
 * «фон / основний / акцент», ні повзунків, ні кнопки «зберегти»: дотик до
 * картки і є вибір.
 *
 * **Пояснення над картками немає.** Шість плиток уже кажуть усе: що вони
 * міняють і що вибір діє одразу. Текст над ними був інструкцією до дії, яку
 * видно з першого дотику.
 *
 * **Одна панель на обидві оболонки.** Платформа відкриває її палітрою в
 * хедері (`ThemeMenu`), адмінка — кнопкою в бічному меню (`ThemeSheet`).
 * Два різні «вибір теми» розійшлися б на першій же правці.
 *
 * @module packages/shared/src/components/theme/ThemeColorPanel
 */

import type { ReactElement } from "react";
import { THEMES } from "../../styles/registry";
import { ThemeCard } from "./ThemeCard";
import { useStyleTheme } from "./useStyleTheme";

export function ThemeColorPanel(): ReactElement {
  const { scheme, setScheme } = useStyleTheme();

  return (
    <div className="wb-theme-panel">
      <div className="wb-theme-cards">
        {THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            applied={theme.id === scheme}
            onApply={() => setScheme(theme.id)}
          />
        ))}
      </div>
    </div>
  );
}
