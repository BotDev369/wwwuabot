import { useState, useEffect } from "react";
import { PageTopbar } from "../../layout/PageTopbar";
import { apiFetch } from "../../shared/api/client";

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

interface BotInfo {
  ok: boolean;
  result: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  };
}

interface ApiResponse {
  ok: boolean;
  result?: WebhookInfo;
}

export function BotSettingsPage() {
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [webhook, bot] = await Promise.all([
        apiFetch<ApiResponse>("/api/bot/webhook-info"),
        apiFetch<BotInfo>("/api/bot/info"),
      ]);
      if (webhook.ok && webhook.result) setWebhookInfo(webhook.result);
      if (bot.ok) setBotInfo(bot);
    } catch (err) {
      setMessage({ type: "error", text: `Помилка: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const setupWebhook = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ success: boolean; webhook_url: string }>(
        "/api/bot/setup-webhook",
        { method: "POST" },
      );
      if (result.success) {
        setMessage({ type: "success", text: "Вебхук встановлено!" });
        await fetchData();
      } else {
        setMessage({ type: "error", text: "Помилка встановлення" });
      }
    } catch (err) {
      setMessage({ type: "error", text: `Помилка: ${err}` });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteWebhook = async () => {
    if (!confirm("Видалити вебхук? Бот перестане працювати.")) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ success: boolean }>("/api/bot/delete-webhook", { method: "POST" });
      if (result.success) {
        setMessage({ type: "success", text: "Вебхук видалено" });
        await fetchData();
      }
    } catch (err) {
      setMessage({ type: "error", text: `Помилка: ${err}` });
    } finally {
      setActionLoading(false);
    }
  };

  const isWebhookOk = webhookInfo?.url?.includes("bot-dev");

  return (
    <>
      <PageTopbar>
        <h1 className="topbar-title">Налаштування бота</h1>
        <div className="topbar-right">
          <button className="btn btn--secondary" onClick={fetchData} disabled={loading}>
            Оновити
          </button>
        </div>
      </PageTopbar>

      <section style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {loading ? (
          <div className="empty-state">
            <span className="empty-state-text">Завантаження...</span>
          </div>
        ) : (
          <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Повідомлення */}
            {message && (
              <div className={`status-badge status-badge--${message.type === "success" ? "saved" : "error"}`}>
                {message.text}
              </div>
            )}

            {/* Бот */}
            {botInfo?.result && (
              <div className="block-card">
                <div className="block-card-header">
                  <span className="block-type-badge">🤖</span>
                  <span className="block-type-label">Бот</span>
                  <span className="status-badge status-badge--saved">Активний</span>
                </div>
                <div className="block-card-body">
                  <div className="block-row" style={{ gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Username</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>@{botInfo.result.username}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>ID</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{botInfo.result.id}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Webhook */}
            <div className="block-card">
              <div className="block-card-header">
                <span className="block-type-badge">🔗</span>
                <span className="block-type-label">Webhook</span>
                {isWebhookOk ? (
                  <span className="status-badge status-badge--saved">OK</span>
                ) : (
                  <span className="status-badge status-badge--error">Не налаштовано</span>
                )}
              </div>
              <div className="block-card-body">
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>URL</div>
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 10px",
                    wordBreak: "break-all",
                    color: webhookInfo?.url ? "var(--text-primary)" : "var(--text-muted)",
                  }}>
                    {webhookInfo?.url || "Не встановлено"}
                  </div>
                </div>

                <div className="block-row" style={{ gap: 16, marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Очікуючі: </span>
                    <span style={{ fontSize: 13 }}>{webhookInfo?.pending_update_count ?? 0}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>SSL: </span>
                    <span style={{ fontSize: 13 }}>{webhookInfo?.has_custom_certificate ? "✅" : "❌"}</span>
                  </div>
                </div>

                {webhookInfo?.last_error_message && (
                  <div style={{
                    background: "var(--red-dim)",
                    border: "1px solid var(--red)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                    marginBottom: 12,
                  }}>
                    <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 600, marginBottom: 2 }}>Остання помилка:</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{webhookInfo.last_error_message}</div>
                  </div>
                )}

                <div className="block-row" style={{ gap: 8 }}>
                  <button
                    className="btn btn--primary"
                    onClick={setupWebhook}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Зачекайте..." : "Встановити вебхук"}
                  </button>
                  <button
                    className="btn btn--danger"
                    onClick={deleteWebhook}
                    disabled={actionLoading}
                  >
                    Видалити
                  </button>
                </div>
              </div>
            </div>

            {/* Довідка */}
            <div className="block-card">
              <div className="block-card-header">
                <span className="block-type-badge">ℹ️</span>
                <span className="block-type-label">Довідка</span>
              </div>
              <div className="block-card-body" style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p><strong>Встановити вебхук</strong> — оновлює URL вебхука на bot-dev</p>
                <p><strong>Видалити вебхук</strong> — бот перестане отримувати оновлення</p>
                <p><strong>Оновити</strong> — завантажує актуальну інформацію з Telegram API</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
