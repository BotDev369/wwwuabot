/**
 * Застосовує збережений theme та style перед першим рендером,
 * щоб уникнути "flash" (мерехтіння) при завантаженні.
 *
 * Викликається в main.tsx кожного воркера ДО createRoot().render().
 * Використовує localStorage та CSS-змінні — працює без React.
 */
export function initTheme(): void {
  try {
    const t = localStorage.getItem("wwwuabot-theme") || "system";
    const resolved =
      t === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : t;
    document.documentElement.setAttribute("data-theme", resolved);

    const s = localStorage.getItem("wwwuabot-style") || "basic";
    document.documentElement.setAttribute("data-style", s);

    // Застосовуємо CSS-змінні стилю з реєстру
    if (s !== "basic") {
      import("@wwwuabot/shared").then(({ STYLES }) => {
        const def = STYLES.find((st) => st.id === s);
        if (!def) return;
        const isDark = resolved === "dark";
        const vars =
          isDark && Object.keys(def.darkVars).length
            ? def.darkVars
            : def.lightVars;
        for (const [prop, val] of Object.entries(vars)) {
          document.documentElement.style.setProperty(
            prop,
            val as string,
          );
        }
      });
    }
  } catch {
    /* ignore — localStorage може бути недоступний */
  }
}
