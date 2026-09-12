/**
 * Page Builder — Theme Toggle Block.
 *
 * Кнопка перемикання теми (бренд Apple/Material + світла/темна схема)
 * як блок сценарію. Замінює захардкодений ThemeButton у сайдбарі.
 *
 * @module packages/ui/src/blocks/ThemeToggleBlock
 */

import { useState, useEffect } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { useStyleTheme, icons } from "@wwwuabot/shared";

export function ThemeToggleBlock({ block }: BlockComponentProps) {
  const {
    label = "Тема",
    showLabel = true,
    layout = "row",
  } = block.props as {
    label?: string;
    showLabel?: boolean;
    layout?: "row" | "column";
  };

  const { scheme, toggleScheme } = useStyleTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = scheme === "dark";
  const justify = layout === "column" ? "flex-start" : "center";

  return (
    <button
      type="button"
      className="wb-block-theme-toggle"
      onClick={toggleScheme}
      aria-label={`Перемкнути на ${isDark ? "світлу" : "темну"} тему`}
      style={{
        display: "flex",
        flexDirection: layout === "column" ? "column" : "row",
        alignItems: "center",
        justifyContent: justify,
        gap: "var(--sp-2)",
        padding: "var(--sp-2) var(--sp-3)",
        background: "var(--bg-2)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        fontSize: "var(--text-sm)",
        width: layout === "column" ? "auto" : "fit-content",
      }}
    >
      <span style={{ display: "inline-flex" }}>
        {mounted ? (isDark ? icons["sun"] : icons["moon"]) : icons["sun"]}
      </span>
      {showLabel && label && <span>{label}</span>}
    </button>
  );
}
