import { useState, useEffect } from "react";
import { PageTopbar } from "../../layout/PageTopbar";
import { apiFetch } from "../../shared/api/client";
import { Icon } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";

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

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

export function BotSettingsPage() {
  const dialog = useDialog();
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [telegramResponse, setTelegramResponse] = useState<TelegramResponse | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [webhook, bot] = await Promise.all([
        apiFetch<{ ok: boolean; result?: WebhookInfo }>("/api/bot/webhook-info"),
        apiFetch<BotInfo>("/api/bot/info"),
      ]);
      if (webhook.ok && webhook.result) setWebhookInfo(webhook.result);
      if (bot.ok) setBotInfo(bot);
      setTelegramResponse(webhook);
    } catch (err) {
      setMessage({ type: "error", text: `Помилка: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetching: setState in fetchData()
    fetchData();
  }, []);

  const setupWebhook = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ success: boolean; result: TelegramResponse }>(
        "/api/bot/setup-webhook",
        { method: "POST" },
      );
      setTelegramResponse(result.result);
      if (result.success) {
        setMessage({ type: "success", text: "Вебхук встановлено!" });
        // Оновлюємо webhook info після встановлення
        const webhook = await apiFetch<{ ok: boolean; result?: WebhookInfo }>(
          "/api/bot/webhook-info",
        );
        if (webhook.ok && webhook.result) setWebhookInfo(webhook.result);
        setTelegramResponse(webhook);
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
    // Спільний діалог, а не `confirm`: той самий вигляд, що в TWA
    const ok = await dialog.confirm("Видалити вебхук? Бот перестане працювати.", {
      tone: "danger",
      confirmText: "Видалити",
    });
    if (!ok) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ success: boolean; result: TelegramResponse }>(
        "/api/bot/delete-webhook",
        { method: "POST" },
      );
      setTelegramResponse(result.result);
      if (result.success) {
        setMessage({ type: "success", text: "Вебхук видалено" });
        // Оновлюємо webhook info після видалення
        const webhook = await apiFetch<{ ok: boolean; result?: WebhookInfo }>(
          "/api/bot/webhook-info",
        );
        if (webhook.ok) {
          // Якщо webhook видалено, result буде пустим об'єктом
          setWebhookInfo(
            webhook.result || { url: "", has_custom_certificate: false, pending_update_count: 0 },
          );
        }
        setTelegramResponse(webhook);
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
        <h1 className="wb-topbar-title">Налаштування бота</h1>
        <div className="wb-topbar-right">
          <button className="wb-btn wb-btn-secondary" onClick={fetchData} disabled={loading}>
            Оновити
          </button>
        </div>
      </PageTopbar>

      <section className="bs-body">
        {loading ? (
          <div className="empty-state">
            <span className="empty-state-text">Завантаження...</span>
          </div>
        ) : (
          <div className="bs-stack">
            {/* Повідомлення */}
            {message && (
              <div
                className={`wb-badge ${message.type === "success" ? "wb-badge-green" : "wb-badge-red"}`}
              >
                {message.text}
              </div>
            )}

            {/* Бот */}
            {botInfo?.result && (
              <div className="wb-card">
                <div className="wb-card-header">
                  <span className="block-type-badge">
                    <Icon name="bot" size={14} />
                  </span>
                  <span className="block-type-label">Бот</span>
                  <span className="wb-badge wb-badge-green">Активний</span>
                </div>
                <div className="wb-card-body">
                  <div className="bs-cols">
                    <div className="bs-col">
                      <div className="bs-label">Username</div>
                      <div className="bs-value">@{botInfo.result.username}</div>
                    </div>
                    <div className="bs-col">
                      <div className="bs-label">ID</div>
                      <div className="bs-value">{String(botInfo.result.id)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Webhook */}
            <div className="wb-card">
              <div className="wb-card-header">
                <span className="block-type-badge">
                  <Icon name="link" size={14} />
                </span>
                <span className="block-type-label">Webhook</span>
                {isWebhookOk ? (
                  <span className="wb-badge wb-badge-green">OK</span>
                ) : webhookInfo?.url ? (
                  <span className="wb-badge wb-badge-red">Не правильна URL</span>
                ) : (
                  <span className="wb-badge wb-badge-red">Не налаштовано</span>
                )}
              </div>
              <div className="wb-card-body">
                <div className="bs-field">
                  <div className="bs-label">URL</div>
                  <div className={`bs-mono-box${webhookInfo?.url ? "" : " bs-mono-box--empty"}`}>
                    {webhookInfo?.url || "Не встановлено"}
                  </div>
                </div>

                <div className="bs-stats">
                  <div>
                    <span className="bs-stat__label">Очікуючі: </span>
                    <span className="bs-stat__value">{webhookInfo?.pending_update_count ?? 0}</span>
                  </div>
                  <div>
                    <span className="bs-stat__label">SSL: </span>
                    <span className="bs-stat__value">
                      {webhookInfo?.has_custom_certificate ? "✅" : "❌"}
                    </span>
                  </div>
                </div>

                {webhookInfo?.last_error_message && (
                  <div className="bs-error-box">
                    <div className="bs-error-box__title">Остання помилка:</div>
                    <div className="bs-error-box__text">{webhookInfo.last_error_message}</div>
                  </div>
                )}

                <div className="bs-actions">
                  <button
                    className="wb-btn wb-btn-primary"
                    onClick={setupWebhook}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Зачекайте..." : "Встановити вебхук"}
                  </button>
                  <button
                    className="wb-btn wb-btn-danger"
                    onClick={deleteWebhook}
                    disabled={actionLoading}
                  >
                    Видалити
                  </button>
                </div>
              </div>
            </div>

            {/* Реальна відповідь від Telegram */}
            {telegramResponse && (
              <div className="wb-card">
                <div className="wb-card-header">
                  <span className="block-type-badge">
                    <Icon name="upload" size={14} />
                  </span>
                  <span className="block-type-label">Відповідь від Telegram API</span>
                  {telegramResponse.ok ? (
                    <span className="wb-badge wb-badge-green">OK</span>
                  ) : (
                    <span className="wb-badge wb-badge-red">Помилка</span>
                  )}
                </div>
                <div className="wb-card-body">
                  <pre className="bs-json">{JSON.stringify(telegramResponse, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
