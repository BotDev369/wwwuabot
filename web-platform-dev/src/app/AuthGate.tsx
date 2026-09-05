import { type ReactNode, useState, useEffect } from "react";

const BOT_USERNAME = "botdev_test_001_bot";

interface AuthGateProps {
  children: ReactNode;
}

function isTelegramWebApp(): boolean {
  try {
    const tg = window.Telegram?.WebApp;
    // SDK creates empty object even outside Telegram.
    // Real Telegram has initDataUnsafe.user with id.
    return !!tg?.initDataUnsafe?.user?.id;
  } catch {
    return false;
  }
}

export function AuthGate({ children }: AuthGateProps) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthorized(isTelegramWebApp());
  }, []);

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 p-6 text-center">
        <p>Завантаження...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 p-6 text-center">
        <h2>WWWUABot</h2>
        <p className="text-secondary">Відкрийте веб-платформу через Telegram бот.</p>
        <a
          href={`https://t.me/${BOT_USERNAME}`}
          className="wb-btn wb-btn-telegram"
        >
          ✈️ Відкрити в Telegram
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
