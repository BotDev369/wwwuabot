import { useEffect, useState, type ReactNode } from "react";
import { checkAuth } from "../shared/api/auth.api";
import { LoginScreen } from "./LoginScreen";

/**
 * Вхід у панель: два паролі, один екран. Обидва входи бачать усю панель —
 * різниця лише в тому, від чийого імені піде запис у стіл (див. `desk.api`).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">(
    "loading",
  );

  useEffect(() => {
    checkAuth()
      .then((side) => setAuthState(side ? "authenticated" : "unauthenticated"))
      .catch(() => setAuthState("unauthenticated"));
  }, []);

  if (authState === "loading") {
    return (
      <div className="wb-splash">
        <span className="wb-splash-icon">✦</span>
      </div>
    );
  }

  if (authState === "unauthenticated") return <LoginScreen />;

  return <>{children}</>;
}
