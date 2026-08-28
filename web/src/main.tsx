import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Apply stored theme + style before first render to avoid flash
try {
  const t = localStorage.getItem("wwwuabot-theme") || "system";
  const resolved = t === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : t;
  document.documentElement.setAttribute("data-theme", resolved);

  const s = localStorage.getItem("wwwuabot-style") || "basic";
  document.documentElement.setAttribute("data-style", s);

  // Apply style CSS variables from registry
  if (s !== "basic") {
    import("@wwwuabot/shared").then(({ STYLES }) => {
      const def = STYLES.find((st) => st.id === s);
      if (!def) return;
      const isDark = resolved === "dark";
      const vars = isDark && Object.keys(def.darkVars).length ? def.darkVars : def.lightVars;
      for (const [prop, val] of Object.entries(vars)) {
        document.documentElement.style.setProperty(prop, val as string);
      }
    });
  }
} catch { /* ignore */ }

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
