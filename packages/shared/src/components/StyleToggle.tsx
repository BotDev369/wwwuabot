import { useState, useEffect, useCallback } from "react";
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
 * Combined brand + scheme hook. No "system" mode.
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
};

/**
 * Unified Theme button for the sidebar.
 * Opens a full-screen modal with brand selector + dark/light toggle.
 */
export function ThemeButton({ compact = false }: { compact?: boolean }) {
  const { brand, scheme, setBrand, toggleScheme } = useStyleTheme();
  const [open, setOpen] = useState(false);

  const isDark = scheme === "dark";

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      {/* ── Trigger Button ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Тема"
        aria-label="Налаштування теми"
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

      {/* ── Full-screen Modal ── */}
      {open && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--surface-overlay, rgba(0,0,0,0.5))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            className="modal"
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg, 16px)",
              maxWidth: 400,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "var(--shadow-xl)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px 0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Тема
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="modal-close"
                aria-label="Закрити"
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px 8px",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: "16px 20px 20px" }}>
              {/* Brand selector */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    marginBottom: 10,
                  }}
                >
                  Бренд
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {BRANDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBrand(b.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: "var(--radius)",
                        cursor: "pointer",
                        fontSize: 15,
                        fontFamily: "var(--font-ui)",
                        fontWeight: b.id === brand ? 600 : 500,
                        color: b.id === brand ? "var(--accent)" : "var(--text-primary)",
                        background: b.id === brand ? "var(--accent-dim)" : "var(--bg-2)",
                        border: b.id === brand ? "2px solid var(--accent)" : "2px solid transparent",
                        width: "100%",
                        textAlign: "left",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 18, width: 24, textAlign: "center", flexShrink: 0 }}>
                        {b.id === brand ? "✓" : b.icon || "○"}
                      </span>
                      <span>{b.labelUk}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "var(--border)", margin: "0 0 20px" }} />

              {/* Dark / Light toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
                    Темна тема
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {isDark ? "Увімкнено" : "Вимкнено"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleScheme}
                  aria-label={`Перемкнути на ${isDark ? "світлу" : "темну"} тему`}
                  style={{
                    width: 52,
                    height: 28,
                    borderRadius: 14,
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
                      top: 3,
                      left: isDark ? 25 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
