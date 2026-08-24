import { type ReactNode, useState, useEffect } from "react";

const BOT_USERNAME = "botdev_test_001_bot";

interface AuthGateProps {
  children: ReactNode;
}

function isTelegramWebApp(): boolean {
  try {
    const tg = (window as any).Telegram?.WebApp;
    // SDK creates empty object even outside Telegram.
    // Real Telegram has initDataUnsafe.user with id.
    return !!tg?.initDataUnsafe?.user?.id;
  } catch {
    return false;
  }
}

export default function AuthGate({ children }: AuthGateProps) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthorized(isTelegramWebApp());
  }, []);

  if (authorized === null) {
    return (
      <div style={{ 
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", flexDirection: "column", gap: "16px",
        padding: "24px", textAlign: "center"
      }}>
        <p>Завантаження...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ 
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", flexDirection: "column", gap: "16px",
        padding: "24px", textAlign: "center"
      }}>
        <h2>WWWUABot</h2>
        <p>Відкрийте веб-платформу через Telegram бот.</p>
        <a
          href={`https://t.me/${BOT_USERNAME}`}
          style={{
            display: "inline-block", padding: "14px 32px",
            backgroundColor: "#0088cc", color: "#fff",
            borderRadius: "12px", textDecoration: "none",
            fontSize: "16px", fontWeight: 600,
          }}
        >
          ✈️ Відкрити в Telegram
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
