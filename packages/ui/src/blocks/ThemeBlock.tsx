/**
 * Page Builder — блок теми.
 *
 * Три контроли (кнопка теми, перемикач, компактна кнопка) — три варіанти
 * одного вчинку. Схема перемикача є станом (`--on`), а не кольором у розмітці.
 *
 * @module packages/ui/src/blocks/ThemeBlock
 */
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { ThemeButton, useStyleTheme, icons } from "@wwwuabot/shared";

export function ThemeBlock({ block }: BlockComponentProps) {
  const {
    variant = "modal",
    label = "Тема",
    showLabel = true,
  } = block.props as {
    variant?: "modal" | "toggle" | "compact";
    label?: string;
    showLabel?: boolean;
  };

  const { scheme, setScheme } = useStyleTheme();
  const isDark = scheme === "dark";

  const toggleScheme = () => {
    setScheme(isDark ? "light" : "dark");
  };

  return (
    <div className="wb-block-theme">
      {variant === "modal" ? (
        <ThemeButton compact={!showLabel} />
      ) : variant === "toggle" ? (
        <button
          type="button"
          onClick={toggleScheme}
          title={`Перемкнути на ${isDark ? "світлу" : "темну"} тему`}
          aria-label="Перемикач теми"
          className={`wb-block-theme__toggle${isDark ? " wb-block-theme__toggle--on" : ""}`}
        >
          <span className="wb-block-theme__icon">{isDark ? icons["moon"] : icons["sun"]}</span>
          {showLabel && <span>{label || (isDark ? "Темна" : "Світла")}</span>}
          <span className="wb-block-theme__track">
            <span className="wb-block-theme__knob" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={toggleScheme}
          title={`Перемкнути тему (${isDark ? "Зараз: темна" : "Зараз: світла"})`}
          aria-label="Перемикач теми"
          className="wb-block-theme__compact"
        >
          {isDark ? icons["moon"] : icons["sun"]}
        </button>
      )}
    </div>
  );
}
