import { useEffect, useState, type ReactNode } from "react";
import { checkAuth } from "../shared/api/auth.api";
import { LoginScreen } from "./LoginScreen";

export function AuthGate({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    checkAuth()
      .then((ok: boolean) => setAuthState(ok ? "authenticated" : "unauthenticated"))
      .catch(() => setAuthState("unauthenticated"));
  }, []);

  if (authState === "loading") {
    return (
      <div className="splash">
        <span className="splash-icon">✦</span>
      </div>
    );
  }

  if (authState === "unauthenticated") return <LoginScreen />;

  return <>{children}</>;
}