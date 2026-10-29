/**
 * Page Builder — Theme Block.
 *
 * Theme switcher supporting light/dark toggle and the user's three colors.
 * Compatible with all zones (header, sidebar, main, footer).
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
    align = "left",
  } = block.props as {
    variant?: "modal" | "toggle" | "compact";
    label?: string;
    showLabel?: boolean;
    align?: "left" | "center" | "right";
  };

  const { scheme, setScheme } = useStyleTheme();
  const isDark = scheme === "dark";

  const toggleScheme = () => {
    setScheme(isDark ? "light" : "dark");
  };

  const justify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <div
      className="wb-block-theme"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        width: "100%",
      }}
    >
      {variant === "modal" ? (
        <ThemeButton compact={!showLabel} />
      ) : variant === "toggle" ? (
        <button
          type="button"
          onClick={toggleScheme}
          title={`Перемкнути на ${isDark ? "світлу" : "темну"} тему`}
          aria-label="Перемикач теми"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            padding: "var(--sp-1) var(--sp-3)",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border)",
            background: "var(--bg-2)",
            color: "var(--text-primary)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-medium)",
            transition: "all var(--duration-fast) var(--ease)",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              color: "var(--accent)",
            }}
          >
            {isDark ? icons["moon"] : icons["sun"]}
          </span>
          {showLabel && <span>{label || (isDark ? "Темна" : "Світла")}</span>}
          <span
            style={{
              width: 28,
              height: 16,
              borderRadius: "var(--radius-full)",
              background: isDark ? "var(--accent)" : "var(--bg-4)",
              display: "inline-flex",
              alignItems: "center",
              padding: 2,
              transition: "background var(--duration-fast) var(--ease)",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: isDark ? "var(--text-inverse)" : "var(--surface)",
                transform: isDark ? "translateX(12px)" : "translateX(0)",
                transition: "transform var(--duration-fast) var(--ease)",
                boxShadow: "var(--shadow-xs)",
              }}
            />
          </span>
        </button>
      ) : (
        /* compact circular button */
        <button
          type="button"
          onClick={toggleScheme}
          title={`Перемкнути тему (${isDark ? "Зараз: темна" : "Зараз: світла"})`}
          aria-label="Перемикач теми"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--bg-2)",
            color: "var(--accent)",
            cursor: "pointer",
            transition: "all var(--duration-fast) var(--ease)",
          }}
        >
          {isDark ? icons["moon"] : icons["sun"]}
        </button>
      )}
    </div>
  );
}
