import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme } from "@wwwuabot/shared";
import "./index.css";
import App from "./App.tsx";

// Застосовуємо theme/style перед першим рендером (унікальний код)
initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
