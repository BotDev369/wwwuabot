import type { AppContext } from "../../shared/types/env";

export interface TemplateContext {
  user_id?: number;
  user_name?: string;
  user_username?: string;
  datetime?: string;
  codeword?: string;
  cart_items?: string;
  cart_total?: number;
  order_id?: number;
  [key: string]: any;
}

/**
 * Формує контекст даних для шаблонізатора.
 */
export function buildTemplateContext(
  ctx: AppContext,
  extraData?: Record<string, any>,
): TemplateContext {
  const user = ctx.from;
  const firstName = user?.first_name || "...";
  const lastName = user?.last_name || "...";
  const userName = `${firstName} ${lastName}`.trim();
  const userUsername = user?.username ? `@${user.username}` : "без username";

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const datetime = `${day}.${month}.${year} ${hours}:${minutes}`;

  const context: TemplateContext = {
    user_id: user?.id,
    user_name: userName,
    user_username: userUsername,
    datetime,
    codeword: ctx.screen?.codeword,
    ...extraData,
  };

  return context;
}

/**
 * Підставляє змінні ${...} у шаблон.
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = context[trimmedKey];

    if (value === undefined || value === null) {
      return "";
    }

    return String(value);
  });
}
