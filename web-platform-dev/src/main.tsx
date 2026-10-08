import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme } from "@wwwuabot/shared";
import { DialogProvider } from "@wwwuabot/ui/dialog";
import "./index.css";
import App from "./App.tsx";
import { mountInsetsReadout } from "./shared/insets-readout.ts";

// Застосовуємо theme/style перед першим рендером (унікальний код)
initTheme();

// Тимчасово: числа вставок клієнта на екрані (див. `shared/insets-readout.ts`).
mountInsetsReadout();

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
