import { useEffect, useState, type ReactNode } from "react";
import { checkAuth } from "../shared/api/auth.api";
import { useSession } from "../shared/session.store";
import { LoginScreen } from "./LoginScreen";

/**
 * Вхід у панель — два паролі, один екран.
 *
 * Сергій дістає всю панель, Buffy — лише «Стіл»: її адреса поза `/desk`
 * переводиться туди ж, бо решта сторінок їй однаково відповість 401.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">(
    "loading",
  );
  const setSide = useSession((state) => state.setSide);

  useEffect(() => {
    checkAuth()
      .then((side) => {
        setSide(side);
        setAuthState(side ? "authenticated" : "unauthenticated");
        if (side === "buffy" && window.location.pathname !== "/desk") {
          window.location.replace("/desk");
        }
      })
      .catch(() => setAuthState("unauthenticated"));
  }, [setSide]);

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
