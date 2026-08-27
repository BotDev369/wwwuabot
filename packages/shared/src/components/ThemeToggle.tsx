import { useState, useEffect, useCallback } from "react";

type Theme = "light" |"dark" | "system";

const STORAGE_KEY = "wwwuabot-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch { /* ignore */ }
    applyTheme(t);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for OS changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme };
}

const icons: Record<Theme, string> = {
  light: "☀️",
  dark: "🌙",
  system: "💻",
};

const labels: Record<Theme, string> = {
  light: "Світла",
  dark: "Темна",
  system: "За системою",
};

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  const next = useCallback(() => {
    const order: Theme[] = ["light", "dark", "system"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  return (
    <button
      type="button"
      onClick={next}
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
