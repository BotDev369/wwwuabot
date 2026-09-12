/**
 * Page Builder — Theme Block.
 *
 * Theme switcher supporting light/dark theme toggle and brand design system selection.
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
            gap: 8,
            padding: "6px 12px",
            borderRadius: "var(--radius-full, 9999px)",
            border: "1px solid var(--border)",
            background: "var(--bg-2, rgba(128,128,128,0.08))",
            color: "var(--text-primary)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            transition: "all 0.2s",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              color: "var(--accent, #6366f1)",
            }}
          >
            {isDark ? icons["moon"] : icons["sun"]}
          </span>
          {showLabel && <span>{label || (isDark ? "Темна" : "Світла")}</span>}
          <span
            style={{
              width: 28,
              height: 16,
              borderRadius: 8,
              background: isDark ? "var(--accent, #6366f1)" : "var(--bg-4, #ccc)",
              display: "inline-flex",
              alignItems: "center",
              padding: 2,
              transition: "background 0.2s",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#fff",
                transform: isDark ? "translateX(12px)" : "translateX(0)",
                transition: "transform 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
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
            background: "var(--bg-2, rgba(128,128,128,0.08))",
            color: isDark ? "#fbbf24" : "#f59e0b",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {isDark ? icons["moon"] : icons["sun"]}
        </button>
      )}
    </div>
  );
}
