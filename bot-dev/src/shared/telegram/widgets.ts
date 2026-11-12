/**
 * Виклики Bot API 10.4, яких ще немає в grammY: віджети.
 *
 * grammY 1.46 знає Bot API 10.3, тож `sendWidget`, `answerWidgetQuery` та
 * `editMessageWidgetData` ідуть прямим `fetch`. Це тонкий шар: жодної логіки
 * екрана тут немає.
 *
 * @module bot-dev/src/shared/telegram/widgets
 */

const API = "https://api.telegram.org";

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

async function call<T>(token: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as TelegramResponse<T>;
  if (!data.ok) {
    throw new Error(
      `${method} failed: ${data.error_code ?? response.status} ${data.description ?? ""}`,
    );
  }
  return data.result as T;
}

export interface SentWidget {
  message_id: number;
  widget?: { id?: string };
}

export interface SendWidgetInput {
  chatId: number;
  html: string;
  chatData?: string | null;
  allowQueries?: boolean;
}

export function sendWidget(token: string, input: SendWidgetInput): Promise<SentWidget> {
  return call<SentWidget>(token, "sendWidget", {
    chat_id: input.chatId,
    html: input.html,
    ...(input.chatData ? { chat_data: input.chatData } : {}),
    ...(input.allowQueries ? { allow_queries: true } : {}),
  });
}

export function sendRichMessage(
  token: string,
  chatId: number,
  html: string,
): Promise<{ message_id: number }> {
  return call<{ message_id: number }>(token, "sendRichMessage", { chat_id: chatId, html });
}

export function answerWidgetQuery(
  token: string,
  queryId: string,
  data?: string | null,
): Promise<boolean> {
  return call<boolean>(token, "answerWidgetQuery", {
    widget_query_id: queryId,
    ...(data ? { data } : {}),
  });
}

export function editMessageWidgetData(
  token: string,
  chatId: number,
  messageId: number,
  chatData: string,
): Promise<unknown> {
  return call(token, "editMessageWidgetData", {
    chat_id: chatId,
    message_id: messageId,
    chat_data: chatData,
  });
}
