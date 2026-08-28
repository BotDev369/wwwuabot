import { useState, useEffect, useCallback, useRef } from "react";
import {
  STYLES,
  type StyleId,
} from "../styles/registry";

type Theme = "light" | "dark" | "system";

const STYLE_KEY = "wwwuabot-style";
const THEME_KEY = "wwwuabot-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredStyle(): StyleId {
  try {
    return (localStorage.getItem(STYLE_KEY) as StyleId) || "basic";
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

function applyStyle(id: StyleId) {
  document.documentElement.setAttribute("data-style", id);
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

/**
 * Combined style + theme hook.
 * Manages:
 * - Style: any StyleId from the registry
 * - Theme: "light" | "dark" | "system"
 */
export function useStyleTheme() {
  const [style, setStyleState] = useState<StyleId>(getStoredStyle);
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const setStyle = useCallback((s: StyleId) => {
    setStyleState(s);
    try {
      localStorage.setItem(STYLE_KEY, s);
    } catch {
      /* ignore */
    }
    applyStyle(s);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
    applyTheme(t);
  }, []);

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
    cycleTheme,
  };
}

/* ─── Style Picker Dropdown ──────────────────────────────────────────── */

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
  position: "relative" as const,
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "100%",
  left: 0,
  right: 0,
  marginBottom: 6,
  background: "var(--bg-1)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-lg)",
  zIndex: 200,
  maxHeight: 320,
  overflowY: "auto",
  padding: 4,
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "var(--font-ui)",
  fontWeight: 500,
  color: "var(--text-primary)",
  transition: "background 0.1s",
  border: "none",
  background: "none",
  width: "100%",
  textAlign: "left",
};

const itemActiveStyle: React.CSSProperties = {
  ...itemStyle,
  background: "var(--accent-dim)",
  color: "var(--accent)",
  fontWeight: 600,
};

/**
 * Style picker dropdown — shows all available styles from registry.
 * Click opens a dropdown list above the button.
 */
export function StylePicker({ compact = false }: { compact?: boolean }) {
  const { style, setStyle } = useStyleTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = STYLES.find((s) => s.id === style) ?? STYLES[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (id: StyleId) => {
    setStyle(id);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Style: ${current.labelUk}`}
        aria-label={`Обрати стиль (зараз: ${current.labelUk})`}
        aria-expanded={open}
        style={compact ? { ...btnBase, justifyContent: "center", padding: 8, width: "auto" } : btnBase}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>{current.icon}</span>
        {!compact && <span>{current.labelUk}</span>}
      </button>

      {open && (
        <div style={dropdownStyle}>
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              style={s.id === style ? itemActiveStyle : itemStyle}
              onClick={() => handleSelect(s.id)}
              onMouseEnter={(e) => {
                if (s.id !== style) e.currentTarget.style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                if (s.id !== style) e.currentTarget.style.background = "none";
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, width: 22, textAlign: "center" }}>
                {s.id === style ? "✓" : s.icon}
              </span>
              <span>{s.labelUk}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Theme toggle: light ↔ dark ↔ system.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, cycleTheme } = useStyleTheme();

  const icons: Record<Theme, string> = {
    light: "\u2600\uFE0F",
    dark: "\uD83C\uDF19",
    system: "\uD83D\uDCBB",
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
      style={compact ? { ...btnBase, justifyContent: "center", padding: 8, width: "auto" } : btnBase}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icons[theme]}</span>
      {!compact && <span>{labels[theme]}</span>}
    </button>
  );
}
