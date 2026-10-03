/**
 * `ThemeCard` — **єдина картка теми на весь продукт**: шаблони, свої теми,
 * публічні й теми в Просторі показують її.
 *
 * **Картка і є прев'ю.** Тло — фон теми, назва — її основний колір, а шрифт
 * підписом акцентним: це і є її три кольори, побачені в одному дотику, без жодної
 * смуги зі зразками. Значення приходять чотирма змінними (`--scheme-*`), тож у
 * розмітці немає жодного кольору (`theme-panel.css`).
 *
 * **Дотик до картки — це застосування.** Окремої кнопки «Застосувати» немає й
 * не було б чого робити: вибір і так стає поточним (`useUserColors`).
 *
 * **Розмір однак усюди** — три в рядку, як шаблони: список тем і список шаблонів
 * читаються однаково, а не «сітка дрібних плиток» поруч із «великими картками».
 *
 * **Меню дій — лише у власної теми.** Чужа й шаблонна не мають чого змінювати:
 * кнопка, яка гарантовано не працює, — це обіцянка, а не дія (`AGENTS.md` §7).
 *
 * @module packages/shared/src/components/theme/ThemeCard
 */

import type { CSSProperties, ReactElement } from "react";
import { fontLabel, STYLE_FONT_LABEL } from "../../styles/fonts";
import { onAccentColor, type UserColors } from "../../styles/user-colors";
import { Icon } from "../Icon";
import { ThemeCardMenu, type ThemeCardAction } from "./ThemeCardMenu";

export interface ThemeCardProps {
  /** Назва теми або шаблону. */
  name: string;
  /** Три кольори теми — з них і тло, і підписи. */
  colors: UserColors;
  /** Шрифт теми (`""` — «як у стилі»). */
  font: string;
  /** Вона діє на екрані просто зараз. */
  applied?: boolean;
  /** Застосувати: дотик до картки. */
  onApply: () => void;
  /** Чип стану («Публічна») — теж кольорами теми. */
  badge?: string;
  /** Дії в меню «···». Немає — картка без кутка (шаблони й чужі теми). */
  actions?: readonly ThemeCardAction[];
  onAction?: (key: string) => void;
}

export function ThemeCard({
  name,
  colors,
  font,
  applied = false,
  onApply,
  badge,
  actions,
  onAction,
}: ThemeCardProps): ReactElement {
  // Чотири змінні: решта картки малюється лише ними (`theme-panel.css`).
  const look = {
    "--scheme-bg": colors.bg,
    "--scheme-text": colors.text,
    "--scheme-accent": colors.accent,
    "--scheme-on-accent": onAccentColor(colors),
  } as CSSProperties;

  return (
    <div className={`wb-theme-card${applied ? " wb-theme-card--on" : ""}`} style={look}>
      {/* Картка-кнопка: дотик до неї і є застосуванням. Меню — **сусід**, а не
          дитина: кнопка в кнопці некоректна розмітка, а меню мусить бути поверх. */}
      <button type="button" className="wb-theme-card-hit" onClick={onApply}>
        <span className="wb-theme-card-name">{name}</span>

        <span className="wb-theme-card-foot">
          {/* Акцент — на підписі шрифту: так видно і сам шрифт, і третій колір. */}
          <span className="wb-theme-card-font">{fontLabel(font) ?? STYLE_FONT_LABEL}</span>

          {badge && <span className="wb-theme-card-badge">{badge}</span>}

          {applied && (
            <span className="wb-theme-card-on">
              <Icon name="check" size={14} />
            </span>
          )}
        </span>
      </button>

      {actions && actions.length > 0 && onAction && (
        <ThemeCardMenu label={`Дії теми «${name}»`} actions={actions} onSelect={onAction} />
      )}
    </div>
  );
}

/** Дії власної теми: змінити й прибрати. Ключі — стабільні, а не індекси. */
export const THEME_OWN_ACTIONS: readonly ThemeCardAction[] = [
  { key: "edit", label: "Змінити", icon: "edit" },
  { key: "remove", label: "Прибрати", icon: "trash", danger: true },
];
