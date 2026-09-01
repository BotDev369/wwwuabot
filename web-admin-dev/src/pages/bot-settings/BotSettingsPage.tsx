import { useState, useEffect } from "react";
import { apiFetch } from "../../shared/api/client";

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

interface BotInfo {
  ok: boolean;
  result: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
    can_join_groups: boolean;
    can_read_all_group_messages: boolean;
    supports_inline_queries: boolean;
  };
}

interface ApiResponse {
  ok: boolean;
  result?: WebhookInfo;
  description?: string;
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
      if (webhook.ok && webhook.result) {
        setWebhookInfo(webhook.result);
      }
      if (bot.ok) {
        setBotInfo(bot);
      }
    } catch (err) {
      setMessage({ type: "error", text: `Помилка завантаження: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const setupWebhook = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ success: boolean; webhook_url: string; result: ApiResponse }>(
        "/api/bot/setup-webhook",
        { method: "POST" },
      );
      if (result.success) {
        setMessage({ type: "success", text: `Вебхук встановлено: ${result.webhook_url}` });
        await fetchData();
      } else {
        setMessage({ type: "error", text: "Помилка встановлення вебхука" });
      }
    } catch (err) {
      setMessage({ type: "error", text: `Помилка: ${err}` });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteWebhook = async () => {
    if (!confirm("Ви впевнені що хочете видалити вебхук? Бот перестане отримувати оновлення.")) {
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ success: boolean; result: ApiResponse }>(
        "/api/bot/delete-webhook",
        { method: "POST" },
      );
      if (result.success) {
        setMessage({ type: "success", text: "Вебхук видалено" });
        await fetchData();
      } else {
        setMessage({ type: "error", text: "Помилка видалення вебхука" });
      }
    } catch (err) {
      setMessage({ type: "error", text: `Помилка: ${err}` });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Налаштування бота</h1>
        <div className="text-gray-500">Завантаження...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">🤖 Налаштування бота</h1>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Інформація про бота */}
      {botInfo?.result && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Інформація про бота</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500 text-sm">ID:</span>
              <div className="font-mono">{botInfo.result.id}</div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Username:</span>
              <div className="font-mono">@{botInfo.result.username}</div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Ім'я:</span>
              <div>{botInfo.result.first_name}</div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Статус:</span>
              <div className="text-green-600 font-medium">✅ Активний</div>
            </div>
          </div>
        </div>
      )}

      {/* Управління вебхуком */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Webhook</h2>

        {webhookInfo ? (
          <div className="space-y-4">
            <div>
              <span className="text-gray-500 text-sm">Поточна URL:</span>
              <div className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                {webhookInfo.url || "Не встановлено"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500 text-sm">Очікуючі оновлення:</span>
                <div>{webhookInfo.pending_update_count}</div>
              </div>
              <div>
                <span className="text-gray-500 text-sm">SSL сертифікат:</span>
                <div>{webhookInfo.has_custom_certificate ? "✅ Є" : "❌ Немає"}</div>
              </div>
            </div>

            {webhookInfo.last_error_message && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <span className="text-red-600 text-sm font-medium">Остання помилка:</span>
                <div className="text-red-700 text-sm mt-1">{webhookInfo.last_error_message}</div>
                {webhookInfo.last_error_date && (
                  <div className="text-red-500 text-xs mt-1">
                    {new Date(webhookInfo.last_error_date * 1000).toLocaleString("uk-UA")}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 mb-4">Інформація про вебхук недоступна</div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={setupWebhook}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? "Зачекайте..." : "🔄 Встановити вебхук"}
          </button>
          <button
            onClick={deleteWebhook}
            disabled={actionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? "Зачекайте..." : "🗑️ Видалити вебхук"}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            🔄 Оновити
          </button>
        </div>
      </div>

      {/* Швидкі дії */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Швидкі дії</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• <strong>Встановити вебхук</strong> — оновлює URL вебхука на bot-dev</p>
          <p>• <strong>Видалити вебхук</strong> — бот перестане отримувати оновлення від Telegram</p>
          <p>• <strong>Оновити</strong> — завантажує актуальну інформацію з Telegram API</p>
        </div>
      </div>
    </div>
  );
}
