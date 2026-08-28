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
} catch { /* ignore */ }

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
