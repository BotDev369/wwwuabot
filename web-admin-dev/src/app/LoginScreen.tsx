import { useState } from "react";
import { login } from "../shared/api/auth.api";

/**
 * Вхід в адмінку.
 *
 * Розмітка — спільні кирпичики `.wb-auth*`; різниця з платформою не у вигляді,
 * а в тому, що тут пароль і `POST /auth`, а в TWA — `initData` від Telegram.
 */
export function LoginScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await login(password);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Невірний пароль");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wb-auth">
      <div className="wb-auth-card">
        <div className="wb-auth-logo">
          <span className="wb-auth-logo-icon">✦</span>
          <span className="wb-auth-logo-text">WWWUABOT</span>
          <span className="wb-auth-sub">Admin</span>
        </div>
        <form onSubmit={handleSubmit} className="wb-auth-form">
          <div className="wb-auth-field">
            <label htmlFor="password" className="wb-auth-label">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`wb-input wb-auth-input${error ? " wb-auth-input--error" : ""}`}
              placeholder="••••••••"
              autoFocus
              autoComplete="current-password"
            />
            {error && <p className="wb-auth-error">{error}</p>}
          </div>
          <button
            type="submit"
            className="wb-btn wb-btn-primary wb-auth-submit"
            disabled={loading || !password.trim()}
          >
            {loading ? "Вхід..." : "Увійти"}
          </button>
        </form>
      </div>
    </div>
  );
}
