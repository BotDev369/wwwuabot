import type { Env } from "../shared/types";
import { checkAdminAuth, unauthorizedResponse } from "../modules/security/admin-auth";
import { DbProxyService } from "../services/db-proxy.service";

/**
 * Надсилає повідомлення про блокування/розблокування користувача.
 * Викликається з API напряму, щоб юзер отримав одразу.
 */
async function notifyBlockChange(
  env: Env,
  userId: number,
  isNowBlocked: boolean,
): Promise<void> {
  if (!env.BOT_TOKEN) return;

  const codeword = isNowBlocked ? "blocked" : "unblocked";
  const fallbackText = isNowBlocked
    ? "⚠️ Ваш акаунт заблоковано."
    : "✅ Ваш акаунт розблоковано.";

  // Шукаємо сценарій в БД
  let captionText = fallbackText;
  let buttons: unknown[][] = [];
  let photoUrl = "";
  let richMessage = false;
  let richData: unknown[] | null = null;

  try {
    const row = await env.DB.prepare(`SELECT * FROM scenarios WHERE codeword = ?`)
      .bind(codeword)
      .first<Record<string, unknown>>();

    if (row) {
      const parts = [row.caption_top, row.caption_mid, row.caption_bot]
        .filter((p): p is string => typeof p === "string" && p.trim() !== "");
      captionText = parts.join("\n───────\n") || fallbackText;
      try {
        buttons = JSON.parse(typeof row.buttons === "string" ? row.buttons : "[]");
      } catch {
        buttons = [];
      }
      photoUrl = typeof row.photo_url === "string" ? row.photo_url : "";
      richMessage = row.rich_message === "true" || row.rich_message === "1" || row.rich_message === 1;

      if (typeof row.rich_data === "string" && row.rich_data.trim()) {
        try {
          const p = JSON.parse(row.rich_data);
          if (Array.isArray(p)) richData = p;
        } catch {
          // Биті rich_data — надсилаємо звичайний текст
        }
      }
    }
  } catch {
    // Якщо БД недоступна — надсилаємо fallback
  }

  // Або встановлюємо active_scenario = null (щоб бот працював у звичайному режимі)
  if (!isNowBlocked) {
    try {
      await env.DB.prepare(`UPDATE users SET active_scenario = NULL WHERE user_id = ?`)
        .bind(userId)
        .run();
    } catch {
      // Скидання сценарію не критичне — повідомлення все одно надсилаємо
    }
  }

  // Надсилаємо повідомлення
  try {
    const payload: Record<string, unknown> = {
      chat_id: userId,
      text: captionText,
    };

    // Якщо є фото — sendPhoto замість sendText
    if (photoUrl) {
      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: userId,
            photo: photoUrl,
            caption: captionText,
            parse_mode: "HTML",
            reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
          }),
        },
      );
      if (!res.ok) {
        // Fallback: sendText
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    } else {
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
  } catch {
    // Telegram API недоступний — ігноруємо
  }
}

export async function handleDbProxy(request: Request, env: Env): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  if (!checkAdminAuth(request, env)) {
    return unauthorizedResponse();
  }

  let body: {
    action?: string;
    codeword?: string;
    data?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { action, codeword, data } = body;
  const service = new DbProxyService(env);

  switch (action) {
    case "read":
      if (!codeword) return json({ error: "codeword required" }, 400);
      return json(await service.read(codeword));

    case "write":
      if (!codeword || !data || typeof data !== "object") {
        return json({ error: "codeword and data required" }, 400);
      }
      return json(await service.write(codeword, data as Record<string, unknown>));

    case "delete":
      if (!codeword) return json({ error: "codeword required" }, 400);
      return json(await service.delete(codeword));

    case "list_users":
      return json(await service.listUsers());

    case "update_users":
      if (!Array.isArray(data) || data.length === 0) {
        return json({ error: "data (array of users) required" }, 400);
      }
      // Перевіряємо зміну is_blocked і надсилаємо повідомлення
      for (const u of data) {
        const userId = u?.user_id;
        const fields = u?.fields;
        if (userId && fields && typeof fields === "object" && "is_blocked" in fields) {
          const newVal = fields.is_blocked;
          if (newVal === 0 || newVal === 1) {
            // Отримуємо поточний стан з БД
            const current = await env.DB.prepare(`SELECT is_blocked FROM users WHERE user_id = ?`)
              .bind(userId)
              .first<{ is_blocked: number }>();
            const wasBlocked = current?.is_blocked === 1;
            const isNowBlocked = newVal === 1;
            if (wasBlocked !== isNowBlocked) {
              await notifyBlockChange(env, userId, isNowBlocked);
            }
          }
        }
      }
      return json(await service.updateUsers(data));

    case "read_settings":
      return json(await service.readSettings());

    case "update_settings":
      if (!data || typeof data !== "object") {
        return json({ error: "data (object) required" }, 400);
      }
      return json(await service.updateSettings(data as Record<string, unknown>));

    default:
      return json({ error: `Unknown action: ${action}` }, 400);
  }
}
