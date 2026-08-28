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

const btnBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "var(--font-ui)",
  fontWeight: 500,
  transition: "background 0.15s, color 0.15s",
  lineHeight: 1,
  width: "100%",
  textAlign: "left" as const,
};

const btnCompact: React.CSSProperties = {
  ...btnBase,
  justifyContent: "center",
  padding: 8,
  width: "auto",
};

/**
 * Style toggle: basic ↔ apple.
 * Full mode shows label; compact mode shows icon only.
 */
export function StyleToggle({ compact = false }: { compact?: boolean }) {
  const { style, cycleStyle } = useStyleTheme();

  const isApple = style === "apple";
  const icon = isApple ? "" : "";
  const label = isApple ? "Apple" : "Basic";

  return (
    <button
      type="button"
      onClick={cycleStyle}
      title={`Style: ${label}`}
      aria-label={`Toggle style (current: ${label})`}
      style={compact ? btnCompact : btnBase}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      {!compact && <span>{label}</span>}
    </button>
  );
}

/**
 * Theme toggle: light ↔ dark ↔ system.
 * Full mode shows label; compact mode shows icon only.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, cycleTheme } = useStyleTheme();

  const icons: Record<Theme, string> = {
    light: "\u2600\uFE0F",
    dark: "\uD83C\uDF19",
    system: "\uD83D\uDCBB",
  };

  const labels: Record<Theme, string> = {
    light: "Light",
    dark: "Dark",
    system: "System",
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Theme: ${labels[theme]}`}
      aria-label={`Toggle theme (current: ${labels[theme]})`}
      style={compact ? btnCompact : btnBase}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icons[theme]}</span>
      {!compact && <span>{labels[theme]}</span>}
    </button>
  );
}
