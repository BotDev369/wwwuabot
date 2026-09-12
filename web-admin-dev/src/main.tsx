import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme } from "@wwwuabot/shared";
import { DialogProvider } from "@wwwuabot/ui/dialog";
import "./index.css";
import App from "./App.tsx";

// Застосовуємо theme/style перед першим рендером (унікальний код)
initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Спільний діалог: той самий вигляд, що в TWA (@wwwuabot/ui/dialog) */}
    <DialogProvider>
      <App />
    </DialogProvider>
  </StrictMode>,
);
