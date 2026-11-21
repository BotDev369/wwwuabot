import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme, reloadOnNewBuild } from "@wwwuabot/shared";
import { DialogProvider } from "@wwwuabot/ui/dialog";
import "./index.css";
import App from "./App.tsx";
import { installPreviewSession } from "./preview-session";

// Застосовуємо theme/style перед першим рендером (унікальний код)
initTheme();
// Деплой посеред сесії не має лишати вкладку на старому коді.
reloadOnNewBuild({ enabled: import.meta.env.PROD });

// Сесія прев'ю — **до** першого рендеру: `AuthGate` читає `initData` вже на
// першому кадрі, тож пізніша ідентичність дала б порожній екран. Поза `dev`
// запит віддає 404 і нічого не змінюється.
void installPreviewSession().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {/* DialogProvider — нативні alert/confirm/prompt не працюють у Telegram
          Mini App на iOS (WebView не має для них в'юхи), тому весь UI питає
          користувача через спільний діалог. */}
      <DialogProvider>
        <App />
      </DialogProvider>
    </StrictMode>,
  );
});
