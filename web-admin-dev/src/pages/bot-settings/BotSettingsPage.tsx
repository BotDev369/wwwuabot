import { useState, useEffect } from "react";
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
        setMessage({ type: "success", text: `✅ Вебхук встановлено!` });
        await fetchData();
      } else {
        setMessage({ type: "error", text: "❌ Помилка встановлення" });
      }
    } catch (err) {
      setMessage({ type: "error", text: `❌ ${err}` });
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
        setMessage({ type: "success", text: "🗑️ Вебхук видалено" });
        await fetchData();
      }
    } catch (err) {
      setMessage({ type: "error", text: `❌ ${err}` });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">🤖 Налаштування бота</h1>
        <div className="text-gray-500">Завантаження...</div>
      </div>
    );
  }

  const isWebhookOk = webhookInfo?.url?.includes("bot-dev");

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">🤖 Налаштування бота</h1>

      {/* Повідомлення */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === "success"
            ? "bg-green-900/50 text-green-300 border border-green-700"
            : "bg-red-900/50 text-red-300 border border-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* Бот */}
      {botInfo?.result && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {botInfo.result.first_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">@{botInfo.result.username}</div>
              <div className="text-xs text-gray-400">ID: {botInfo.result.id}</div>
            </div>
            <span className="text-green-400 text-sm">✅</span>
          </div>
        </div>
      )}

      {/* Вебхук */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Webhook</h2>
          {isWebhookOk ? (
            <span className="text-green-400 text-xs bg-green-900/50 px-2 py-1 rounded">OK</span>
          ) : (
            <span className="text-yellow-400 text-xs bg-yellow-900/50 px-2 py-1 rounded">⚠️</span>
          )}
        </div>

        {/* URL */}
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">URL:</div>
          <div className="text-xs font-mono bg-gray-900 p-2 rounded break-all text-gray-300">
            {webhookInfo?.url || "Не встановлено"}
          </div>
        </div>

        {/* Статистика */}
        <div className="flex gap-4 text-sm mb-4">
          <div>
            <span className="text-gray-400">Очікуючі: </span>
            <span>{webhookInfo?.pending_update_count ?? 0}</span>
          </div>
          <div>
            <span className="text-gray-400">SSL: </span>
            <span>{webhookInfo?.has_custom_certificate ? "✅" : "❌"}</span>
          </div>
        </div>

        {/* Помилка */}
        {webhookInfo?.last_error_message && (
          <div className="bg-red-900/30 border border-red-800 rounded p-2 mb-4">
            <div className="text-xs text-red-400">⚠️ Остання помилка:</div>
            <div className="text-xs text-red-300 mt-1 break-words">{webhookInfo.last_error_message}</div>
          </div>
        )}

        {/* Кнопки */}
        <div className="flex flex-col gap-2">
          <button
            onClick={setupWebhook}
            disabled={actionLoading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium active:bg-blue-700 disabled:opacity-50"
          >
            {actionLoading ? "⏳ Зачекайте..." : "🔄 Встановити вебхук"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={deleteWebhook}
              disabled={actionLoading}
              className="flex-1 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg text-sm active:bg-red-600/30 disabled:opacity-50"
            >
              🗑️ Видалити
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm active:bg-gray-600 disabled:opacity-50"
            >
              🔄 Оновити
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
