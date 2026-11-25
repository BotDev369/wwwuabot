import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme, reloadOnNewBuild } from "@wwwuabot/shared";
import { isWebEntryBlocked } from "@wwwuabot/shared/security/mini-app";
import { DialogProvider } from "@wwwuabot/ui/dialog";
import "./index.css";
import App from "./App.tsx";

// Гейт першого кадру стоїть в `index.html`; тут лише не малюємо панель, якщо
// він сказав «це не Mini App». Поза Telegram — жодного запиту й жодного кадру.
if (!isWebEntryBlocked(document.documentElement)) {
  // Застосовуємо theme/style перед першим рендером (унікальний код)
  initTheme();
  // Деплой посеред сесії не має лишати панель на старому коді.
  reloadOnNewBuild({ enabled: import.meta.env.PROD });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {/* Спільний діалог: той самий вигляд, що в TWA (@wwwuabot/ui/dialog) */}
      <DialogProvider>
        <App />
      </DialogProvider>
    </StrictMode>,
  );
}
