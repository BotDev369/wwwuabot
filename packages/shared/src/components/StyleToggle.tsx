import { useState, useEffect, useCallback } from "react";

type Style = "basic" | "apple";
type Theme = "light" | "dark" | "system";

const STYLE_KEY = "wwwuabot-style";
const THEME_KEY = "wwwuabot-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredStyle(): Style {
  try {
    return (localStorage.getItem(STYLE_KEY) as Style) || "basic";
  } catch {
    return "basic";
  }
}

function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem(THEME_KEY) as Theme) || "system";
  } catch {
    return "system";
  }
}

function applyStyle(style: Style) {
  document.documentElement.setAttribute("data-style", style);
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

/**
 * Combined style + theme hook.
 * Manages two independent dimensions:
 * - Style: "basic" | "apple" (visual language)
 * - Theme: "light" | "dark" | "system" (color scheme)
 */
export function useStyleTheme() {
  const [style, setStyleState] = useState<Style>(getStoredStyle);
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const setStyle = useCallback((s: Style) => {
    setStyleState(s);
    try { localStorage.setItem(STYLE_KEY, s); } catch { /* ignore */ }
    applyStyle(s);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ }
    applyTheme(t);
  }, []);

  const cycleStyle = useCallback(() => {
    setStyle(style === "basic" ? "apple" : "basic");
  }, [style, setStyle]);

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ["light", "dark", "system"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  // Apply on mount
  useEffect(() => {
    applyStyle(style);
    applyTheme(theme);
  }, [style, theme]);

  // Listen for OS changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return {
    style,
    theme,
    setStyle,
    setTheme,
    cycleStyle,
    cycleTheme,
  };
}

/**
 * Simple toggle button for style (basic ↔ apple).
 * Shows current style icon and label.
 */
export function StyleToggle({ compact = false }: { compact?: boolean }) {
  const { style, cycleStyle } = useStyleTheme();

  const icon = style === "apple" ? "" : "🎨";
  const label = style === "apple" ? "Apple" : "Базовий";

  return (
    <button
      type="button"
      onClick={cycleStyle}
      title={`Стиль: ${label}`}
      aria-label={`Перемкнути стиль (зараз: ${label})`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 0 : 6,
        padding: compact ? 6 : "6px 10px",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        fontSize: compact ? 16 : 13,
        fontFamily: "var(--font-ui)",
        transition: "background 0.15s, color 0.15s",
        lineHeight: 1,
      }}
    >
      <span>{icon}</span>
      {!compact && <span>{label}</span>}
    </button>
  );
}

/**
 * Combined toggle: style + theme in one row.
 * Shows: [🎨 Базовий | ☀️] or [ Apple | 🌙]
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, cycleTheme } = useStyleTheme();

  const icons: Record<Theme, string> = {
    light: "☀️",
    dark: "🌙",
    system: "💻",
  };

  const labels: Record<Theme, string> = {
    light: "Світла",
    dark: "Темна",
    system: "Система",
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Тема: ${labels[theme]}`}
      aria-label={`Перемкнути тему (зараз: ${labels[theme]})`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 0 : 6,
        padding: compact ? 6 : "6px 10px",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        fontSize: compact ? 16 : 13,
        fontFamily: "var(--font-ui)",
        transition: "background 0.15s, color 0.15s",
        lineHeight: 1,
      }}
    >
      <span>{icons[theme]}</span>
      {!compact && <span>{labels[theme]}</span>}
    </button>
  );
}
