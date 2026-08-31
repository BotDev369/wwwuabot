import { useState } from "react";
import { login } from "../shared/api/auth.api";

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
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">✦</span>
          <span className="login-logo-text">WWWUABOT</span>
          <span className="login-logo-sub">Admin</span>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="password" className="login-label">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`login-input${error ? " login-input--error" : ""}`}
              placeholder="••••••••"
              autoFocus
              autoComplete="current-password"
            />
            {error && <p className="login-error">{error}</p>}
          </div>
          <button type="submit" className="login-btn" disabled={loading || !password.trim()}>
            {loading ? "Вхід..." : "Увійти"}
          </button>
        </form>
      </div>
    </div>
  );
}
