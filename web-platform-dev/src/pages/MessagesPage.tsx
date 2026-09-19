/**
 * «Повідомлення» — переписка **між людьми**, без участі бота.
 *
 * Екран лише **зводить** те, що вже є: список розмов і поверхню розмови дає
 * спільний `@wwwuabot/ui/messages`, дані — `useConversations` і `useThread`, а
 * адреса й ідентичність — ця оболонка.
 *
 * **Кому можна писати — вирішує сервер.** Тут немає ані вибору співрозмовника,
 * ані пошуку людей: листування відкривається з уже наявного зв'язку (той, із
 * ким людина зв'язана через контакти), а правило зв'язку читає базу
 * (`api-dev/src/services/messages/links.ts`). Інакше клієнт мусив би знати, кому
 * можна писати, — а це вже друге правило того самого.
 *
 * **Розмова відкривається поверхнею**, а не окремим маршрутом: футер лишається
 * хромом і видно, що ти в застосунку, а «назад» повертає до списку. Адреси в
 * розмови немає навмисно: переписка — це місце, а не сторінка, і посилання на
 * неї вело б у глибину повз список.
 *
 * **Хто я — з профілю, і лише для вигляду.** `meId` потрібен, щоб поставити
 * свої бульбашки праворуч («Ви: …» у списку). Сам сервер його не питає: він
 * бере автора з підписаного `initData`, тож підроблене число змінило б лише
 * бік бульбашки, а не доступ.
 *
 * @module web-platform-dev/src/pages/MessagesPage
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { ConversationList, ThreadSheet } from "@wwwuabot/ui/messages";
import { useConversations } from "./useConversations";
import { useProfile } from "./useProfile";
import { useThread } from "./useThread";

export function MessagesPage(): ReactElement {
  const { conversations, loading, error, reload } = useConversations();
  const { profile } = useProfile();
  const [openPeerId, setOpenPeerId] = useState<number | null>(null);
  const thread = useThread(openPeerId);
  const meId = profile?.id ?? 0;

  /** Вихід із розмови: список перечитуємо — у ній зник бейдж і змінився останок. */
  function closeThread(): void {
    setOpenPeerId(null);
    void reload();
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Повідомлення</h1>
      </div>

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження розмов…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <ConversationList
          conversations={conversations}
          meId={meId}
          onOpen={(peerId) => setOpenPeerId(peerId)}
        />
      )}

      {openPeerId !== null && (
        <ThreadSheet
          peer={thread.peer}
          meId={meId}
          messages={thread.messages}
          loading={thread.loading}
          error={thread.error}
          sending={thread.sending}
          onSend={thread.send}
          onClose={closeThread}
        />
      )}
    </div>
  );
}
