import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme, reloadOnNewBuild } from "@wwwuabot/shared";
import { DialogProvider } from "@wwwuabot/ui/dialog";
import "./index.css";
import App from "./App.tsx";

// Застосовуємо theme/style перед першим рендером (унікальний код)
initTheme();
// Деплой посеред сесії не має лишати вкладку на старому коді.
reloadOnNewBuild();

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
