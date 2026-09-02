import { useState, useEffect, useCallback, useRef } from "react";
import { BRANDS, type Brand, type Scheme } from "../styles/registry";

const BRAND_KEY = "wwwuabot-brand";
const LEGACY_STYLE_KEY = "wwwuabot-style";
const THEME_KEY = "wwwuabot-theme";

function getStoredBrand(): Brand {
  try {
    const stored = localStorage.getItem(BRAND_KEY) as Brand | null;
    if (stored && (stored === "apple" || stored === "android")) return stored;
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

function getStoredScheme(): Scheme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark") return raw;
    return "dark";
  } catch {
    return "dark";
  }
}

function applyBrand(brand: Brand) {
  document.documentElement.setAttribute("data-brand", brand);
}

function applyScheme(scheme: Scheme) {
  document.documentElement.setAttribute("data-theme", scheme);
}

/**
 * Combined brand + scheme hook.
 * No "system" mode — only explicit light/dark.
 */
export function useStyleTheme() {
  const [brand, setBrandState] = useState<Brand>(getStoredBrand);
  const [scheme, setSchemeState] = useState<Scheme>(getStoredScheme);

  const setBrand = useCallback((b: Brand) => {
    setBrandState(b);
    try { localStorage.setItem(BRAND_KEY, b); } catch { /* ignore */ }
    applyBrand(b);
  }, []);

  const setScheme = useCallback((s: Scheme) => {
    setSchemeState(s);
    try { localStorage.setItem(THEME_KEY, s); } catch { /* ignore */ }
    applyScheme(s);
  }, []);

  const toggleScheme = useCallback(() => {
    setScheme(scheme === "dark" ? "light" : "dark");
  }, [scheme, setScheme]);

  useEffect(() => {
    applyBrand(brand);
    applyScheme(scheme);
  }, [brand, scheme]);

  return { brand, scheme, setBrand, setScheme, toggleScheme };
}

/* ─── Button base styles ──────────────────────────────────────────────── */

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

/**
 * Unified Theme button for the sidebar.
 * Shows brand icon + "Тема". Click opens dropdown with:
 * - Brand radio selector (Apple / Material)
 * - Dark / Light toggle switch
 */
export function ThemeButton({ compact = false }: { compact?: boolean }) {
  const { brand, scheme, setBrand, toggleScheme } = useStyleTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isDark = scheme === "dark";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* ── Button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Тема"
        aria-label="Налаштування теми"
        aria-expanded={open}
        style={
          compact
            ? { ...btnBase, justifyContent: "center", padding: 8, width: "auto" }
            : btnBase
        }
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>
          {isDark ? "\uD83C\uDF19" : "\u2600\uFE0F"}
        </span>
        {!compact && <span>Тема</span>}
      </button>

      {/* ── Dropdown ── */}
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
            padding: 8,
            minWidth: 180,
          }}
        >
          {/* Brand selector */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                padding: "0 4px 6px",
              }}
            >
              Бренд
            </div>
            {BRANDS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBrand(b.id)}
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
                  color: b.id === brand ? "var(--accent)" : "var(--text-primary)",
                  background: b.id === brand ? "var(--accent-dim)" : "transparent",
                  border: "none",
                  width: "100%",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (b.id !== brand) e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  if (b.id !== brand) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>
                  {b.id === brand ? "✓" : b.icon || "○"}
                </span>
                <span>{b.labelUk}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", margin: "0 4px 8px" }} />

          {/* Dark / Light toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 4px 0",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
              Темна тема
            </span>
            <button
              type="button"
              onClick={toggleScheme}
              aria-label={`Перемкнути на ${isDark ? "світлу" : "темну"} тему`}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                position: "relative",
                background: isDark ? "var(--accent)" : "var(--bg-4)",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: isDark ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Legacy exports (deprecated) ──────────────────────────────────────── */

/** @deprecated Use ThemeButton instead */
export function StylePicker(_props?: { compact?: boolean }) {
  return null;
}

/** @deprecated Use ThemeButton instead */
export function ThemeToggle(_props?: { compact?: boolean }) {
  return null;
}
