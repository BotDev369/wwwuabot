/**
 * Переписка між людьми платформи — шляхи `/api/messages`.
 *
 * **Навіщо окремо від роутера.** Це один домен (таблиці `conversations`,
 * `messages`, `message_drafts`), а умов у роутері було десять: вони й займали
 * майже половину файлу. Ті самі умови переїхали сюди разом із поясненням — щоб
 * наступний домен знову не додавав рядки в список усіх шляхів воркера
 * (AGENTS.md §3).
 *
 * **Кому можна писати — правило «зв'язані через контакти»**; воно читає
 * `contacts`, тож друга перевірка власника в самому шляху не потрібна:
 * співрозмовника перевірено на зв'язок **перед** будь-яким пошуком розмови
 * (AGENTS.md §7).
 *
 * @module api-dev/src/routes/messages
 */

import type { Env } from "../shared/types";
import {
  handleMessages,
  handleMessageThread,
  handleMessageSend,
  handleMessageRead,
  handleMessageBadge,
  handleMessageClear,
  handleMessageDelete,
  handleMessageCompose,
  handleMessageDraft,
} from "../controllers/messages.controller";

/** Обробити шлях переписки; `null` — це не він (роутер іде далі). */
export function matchMessagesRoute(
  request: Request,
  env: Env,
  pathname: string,
): Response | Promise<Response> | null {
  if (pathname === "/api/messages") {
    return handleMessages(request, env);
  }
  if (pathname === "/api/messages/thread") {
    return handleMessageThread(request, env);
  }
  if (pathname === "/api/messages/send" && request.method === "POST") {
    return handleMessageSend(request, env);
  }
  if (pathname === "/api/messages/read" && request.method === "POST") {
    return handleMessageRead(request, env);
  }
  if (pathname === "/api/messages/badge" && request.method === "GET") {
    return handleMessageBadge(request, env);
  }
  if (pathname === "/api/messages/compose" && request.method === "GET") {
    return handleMessageCompose(request, env);
  }
  if (pathname === "/api/messages/draft" && request.method === "POST") {
    return handleMessageDraft(request, env);
  }
  // Стерти переписку / прибрати розмову. Дві дії, а не одна з прапорцем:
  // різницю між ними бачить людина (розмова лишається чи ні), тож і шлях у них
  // свій — інакше на клієнті з'явився б другий спосіб сказати те саме.
  if (pathname === "/api/messages/clear" && request.method === "POST") {
    return handleMessageClear(request, env);
  }
  if (pathname === "/api/messages/delete" && request.method === "POST") {
    return handleMessageDelete(request, env);
  }
  return null;
}
