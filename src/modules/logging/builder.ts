import type { AppContext } from "../../shared/types/env";
import type { LogMessage } from "../../shared/types/log";

// Допоміжна функція для конвертації timestamp
function formatTimestamp(isoString: string): string {
  // "2026-06-19T00:40:01.234Z" → "2026-06-19 00:40:01"
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Допоміжна функція для формування повного імені
function buildUserFullName(firstName?: string, lastName?: string, username?: string): string {
  const parts = [
    firstName || "...",
    lastName || "...",
    username || "..."
  ];
  return parts.join(" - ");
}

// Допоміжна функція для отримання інфо про файл
function extractFileInfo(ctx: AppContext): string {
  const message = ctx.message;
  
  if (!message) return "...";
  
  // Фото
  if ("photo" in message && message.photo && message.photo.length > 0) {
    const photo = message.photo[message.photo.length - 1];
    return JSON.stringify({
      type: "photo",
      file_id: photo.file_id,
      file_unique_id: photo.file_unique_id,
      width: photo.width,
      height: photo.height,
      file_size: photo.file_size
    });
  }
  
  // Документ
  if ("document" in message && message.document) {
    const doc = message.document;
    return JSON.stringify({
      type: "document",
      file_id: doc.file_id,
      file_unique_id: doc.file_unique_id,
      file_name: doc.file_name || "...",
      mime_type: doc.mime_type || "...",
      file_size: doc.file_size
    });
  }
  
  // Відео
  if ("video" in message && message.video) {
    const video = message.video;
    return JSON.stringify({
      type: "video",
      file_id: video.file_id,
      file_unique_id: video.file_unique_id,
      file_name: video.file_name || "...",
      mime_type: video.mime_type || "...",
      width: video.width,
      height: video.height,
      duration: video.duration,
      file_size: video.file_size
    });
  }
  
  // Аудіо
  if ("audio" in message && message.audio) {
    const audio = message.audio;
    return JSON.stringify({
      type: "audio",
      file_id: audio.file_id,
      file_unique_id: audio.file_unique_id,
      file_name: audio.file_name || "...",
      mime_type: audio.mime_type || "...",
      duration: audio.duration,
      performer: audio.performer || "...",
      title: audio.title || "...",
      file_size: audio.file_size
    });
  }
  
  // Голосове повідомлення
  if ("voice" in message && message.voice) {
    const voice = message.voice;
    return JSON.stringify({
      type: "voice",
      file_id: voice.file_id,
      file_unique_id: voice.file_unique_id,
      mime_type: voice.mime_type || "...",
      duration: voice.duration,
      file_size: voice.file_size
    });
  }
  
  // Відеонотатка
  if ("video_note" in message && message.video_note) {
    const videoNote = message.video_note;
    return JSON.stringify({
      type: "video_note",
      file_id: videoNote.file_id,
      file_unique_id: videoNote.file_unique_id,
      length: videoNote.length,
      duration: videoNote.duration,
      file_size: videoNote.file_size
    });
  }
  
  return "...";
}

// Головна функція: формує повний LogMessage
export function buildLogMessage(
  ctx: AppContext,
  status: 'success' | 'error',
  error?: unknown
): LogMessage {
  const user = ctx.from;
  const chat = ctx.chat;
  const message = ctx.message;
  
  // Визначаємо тип дії та контент
  let actionType = "unknown";
  let actionContentText = "...";
  let actionContentFile = "...";
  
  // Повідомлення (текст, команди, медіа)
  if (message) {
    // Текст або команда
    if ("text" in message && message.text) {
      const text = message.text;
      
      if (text.startsWith("/")) {
        actionType = "command";
        actionContentText = text.split(" ")[0].split("@")[0];
      } else {
        actionType = "message";
        actionContentText = text;
      }
    }
    // Фото
    else if ("photo" in message && message.photo) {
      actionType = "message";
      actionContentText = message.caption || "...";
      actionContentFile = extractFileInfo(ctx);
    }
    // Документ
    else if ("document" in message && message.document) {
      actionType = "message";
      actionContentText = message.caption || "...";
      actionContentFile = extractFileInfo(ctx);
    }
    // Відео
    else if ("video" in message && message.video) {
      actionType = "message";
      actionContentText = message.caption || "...";
      actionContentFile = extractFileInfo(ctx);
    }
    // Аудіо
    else if ("audio" in message && message.audio) {
      actionType = "message";
      actionContentText = message.caption || "...";
      actionContentFile = extractFileInfo(ctx);
    }
    // Голосове
    else if ("voice" in message && message.voice) {
      actionType = "message";
      actionContentFile = extractFileInfo(ctx);
    }
    // Відеонотатка
    else if ("video_note" in message && message.video_note) {
      actionType = "message";
      actionContentFile = extractFileInfo(ctx);
    }
    // Інші типи повідомлень
    else {
      actionType = "message";
      const keys = Object.keys(message).filter(k => 
        k !== "from" && k !== "chat" && k !== "date" && k !== "message_id"
      );
      actionContentText = `[${keys.join(", ")}]`;
    }
  }
  // Callback query (кнопки)
  else if (ctx.callbackQuery) {
    actionType = "callback";
    actionContentText = ctx.callbackQuery.data || "no_data";
  }
  // Inline query
  else if (ctx.inlineQuery) {
    actionType = "inline_query";
    actionContentText = ctx.inlineQuery.query || "no_query";
  }
  // Відредаговане повідомлення
  else if (ctx.editedMessage) {
    actionType = "edited_message";
    if ("text" in ctx.editedMessage && ctx.editedMessage.text) {
      actionContentText = ctx.editedMessage.text;
    }
  }
  
  // Формуємо raw_json
  let rawJson: string;
  if (error) {
    rawJson = JSON.stringify({
      update: ctx.update,
      error: error instanceof Error 
        ? { message: error.message, stack: error.stack } 
        : String(error)
    });
  } else {
    rawJson = JSON.stringify(ctx.update);
  }
  
  return {
    timestamp: formatTimestamp(new Date().toISOString()),
    user_full_name: buildUserFullName(user?.first_name, user?.last_name, user?.username),
    user_id: user?.id,
    action_type: actionType,
    action_content_text: actionContentText,
    action_content_file: actionContentFile,
    environment: ctx.env.ENVIRONMENT,
    language_code: user?.language_code || "...",
    is_premium: user?.is_premium ? "true" : (user ? "false" : "..."),
    chat_id: chat?.id,
    chat_type: chat?.type || "...",
    chat_title: (chat?.title || chat?.first_name) || "...",
    chat_topic_id: message?.message_thread_id?.toString() || "...",
    status,
    duration_ms: 0, // Буде оновлено в middleware
    level: status === 'success' ? 'info' : 'error',
    raw_json: rawJson
  };
}