/**
 * Page Builder — Theme Toggle Block.
 *
 * Кнопка перемикання схеми (світла/темна) як блок сценарію.
 * Замінює захардкодений ThemeButton у сайдбарі.
 *
 * @module packages/ui/src/blocks/ThemeToggleBlock
 */

import { useState, useEffect } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { useStyleTheme, icons } from "@wwwuabot/shared";

export function ThemeToggleBlock({ block }: BlockComponentProps) {
  const { label = "Тема", showLabel = true } = block.props as {
    label?: string;
    showLabel?: boolean;
  };

  const { scheme, toggleScheme } = useStyleTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = scheme === "dark";

  return (
    <button
      type="button"
      className="wb-block-theme-toggle"
      onClick={toggleScheme}
      aria-label={`Перемкнути на ${isDark ? "світлу" : "темну"} тему`}
    >
      <span className="wb-block-theme-toggle__icon">
        {mounted ? (isDark ? icons["sun"] : icons["moon"]) : icons["sun"]}
      </span>
      {showLabel && label && <span>{label}</span>}
    </button>
  );
}
