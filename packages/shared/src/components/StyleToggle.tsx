import { useState, useEffect, useCallback, useRef } from "react";
import { BRANDS, type Brand, type Theme } from "../styles/registry";

const BRAND_KEY = "wwwuabot-brand";
const LEGACY_STYLE_KEY = "wwwuabot-style";
const THEME_KEY = "wwwuabot-theme";

function getSystemScheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredBrand(): Brand {
  try {
    const stored = localStorage.getItem(BRAND_KEY) as Brand | null;
    if (stored && (stored === "apple" || stored === "android")) return stored;
    // Legacy migration
    const legacy = localStorage.getItem(LEGACY_STYLE_KEY);
    if (legacy) {
      const brand: Brand = legacy === "android" ? "android" : "apple";
      localStorage.setItem(BRAND_KEY, brand);
      localStorage.removeItem(LEGACY_STYLE_KEY);
      return brand;
    }
    return "apple";
  } catch {
    return "apple";
  }
}

function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem(THEME_KEY) as Theme) || "system";
  } catch {
    return "system";
  }
}

function applyBrand(brand: Brand) {
  document.documentElement.setAttribute("data-brand", brand);
  // Update Tailwind color tokens to match brand accent
  const brandDef = BRANDS.find((b) => b.id === brand);
  if (brandDef) {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const accentColor = isDark ? "#ffffff" : "#000000";
    document.documentElement.style.setProperty("--color-accent", accentColor);
    document.documentElement.style.setProperty("--color-primary", accentColor);
  }
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemScheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

/**
 * Combined brand + theme hook.
 * Manages:
 * - Brand: "apple" | "android"
 * - Theme: "light" | "dark" | "system"
 */
export function useStyleTheme() {
  const [brand, setBrandState] = useState<Brand>(getStoredBrand);
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const setBrand = useCallback((b: Brand) => {
    setBrandState(b);
    try {
      localStorage.setItem(BRAND_KEY, b);
    } catch {
      /* ignore */
    }
    applyBrand(b);
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
    applyBrand(brand);
    applyTheme(theme);
  }, [brand, theme]);

  // Listen for OS changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return {
    brand,
    theme,
    setBrand,
    setTheme,
    cycleTheme,
  };
}

/* ─── Shared button styles ──────────────────────────────────────────── */

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

/* ─── Brand Picker (Apple / Android) ───────────────────────────────── */

/**
 * Brand picker — shows 2 options (Apple, Material).
 * Click opens a small dropdown above the button.
 */
export function StylePicker({ compact = false }: { compact?: boolean }) {
  const { brand, setBrand } = useStyleTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = BRANDS.find((b) => b.id === brand) ?? BRANDS[0];

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

  const handleSelect = (id: Brand) => {
    setBrand(id);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Бренд: ${current.labelUk}`}
        aria-label={`Обрати бренд (зараз: ${current.labelUk})`}
        aria-expanded={open}
        style={
          compact
            ? { ...btnBase, justifyContent: "center", padding: 8, width: "auto" }
            : btnBase
        }
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>{current.icon}</span>
        {!compact && <span>{current.labelUk}</span>}
      </button>

      {open && (
        <div
          style={{
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
            padding: 4,
          }}
        >
          {BRANDS.map((b) => (
            <button
              key={b.id}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "var(--font-ui)",
                fontWeight: b.id === brand ? 600 : 500,
                color:
                  b.id === brand ? "var(--accent)" : "var(--text-primary)",
                background:
                  b.id === brand ? "var(--accent-dim)" : "transparent",
                transition: "background 0.1s",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
              onClick={() => handleSelect(b.id)}
              onMouseEnter={(e) => {
                if (b.id !== brand)
                  e.currentTarget.style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                if (b.id !== brand) e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  flexShrink: 0,
                  width: 22,
                  textAlign: "center",
                }}
              >
                {b.id === brand ? "✓" : b.icon}
              </span>
              <span>{b.labelUk}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Theme Toggle (Light / Dark / System) ──────────────────────────── */

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
      style={
        compact
          ? { ...btnBase, justifyContent: "center", padding: 8, width: "auto" }
          : btnBase
      }
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icons[theme]}</span>
      {!compact && <span>{labels[theme]}</span>}
    </button>
  );
}
