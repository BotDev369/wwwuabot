/**
 * «Повідомлення» — переписка **між людьми**, без участі бота.
 *
 * Екран лише **зводить** те, що вже є: список розмов і поверхню розмови дає
 * спільний `@wwwuabot/ui/messages`, дані — `useConversations` і `useThread`, а
 * адреса, ідентичність і вигляд списку — ця оболонка.
 *
 * **Кому можна писати — вирішує сервер.** Тут немає ані вибору співрозмовника,
 * ані пошуку людей: листування відкривається з уже наявного зв'язку (той, із
 * ким людина зв'язана через контакти), а правило зв'язку читає база
 * (`api-dev/src/services/messages/links.ts`). Інакше клієнт мусив би знати, кому
 * можна писати, — а це вже друге правило того самого. Пошук у смузі тому
 * шукає **свої розмови**, а не людей у продукті.
 *
 * **Розмова відкривається поверхнею**, а не окремим маршрутом: футер лишається
 * хромом і видно, що ти в застосунку, а «назад» повертає до списку. Адреси в
 * розмови немає навмисно: переписка — це місце, а не сторінка, і посилання на
 * неї вело б у глибину повз список.
 *
 * **Числа в шапці тут не дублюються.** Непрочитане показує бейдж у футері, і
 * він видно завжди — другий такий самий лічильник у заголовку був би тим самим
 * фактом у двох місцях (та сама причина, чому в футері акцент лише один).
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
import {
  ConversationList,
  DEFAULT_MESSAGES_VIEW,
  MessagesToolbar,
  ThreadSheet,
  buildConversationGroups,
  filterConversations,
  type MessagesView,
} from "@wwwuabot/ui/messages";
import { useConversations } from "./useConversations";
import { useProfile } from "./useProfile";
import { useThread } from "./useThread";

export function MessagesPage(): ReactElement {
  const { conversations, loading, error, reload } = useConversations();
  const { profile } = useProfile();
  // Вигляд списку — стан **екрана**, а не даних: сервер віддає ті самі розмови,
  // а те, як їх показати, вирішує той, хто дивиться.
  const [view, setView] = useState<MessagesView>(DEFAULT_MESSAGES_VIEW);
  const [openPeerId, setOpenPeerId] = useState<number | null>(null);
  const thread = useThread(openPeerId);
  const meId = profile?.id ?? 0;

  const groups = buildConversationGroups(conversations, view);
  const visible = filterConversations(conversations, view);
  const hasConversations = !loading && !error && conversations.length > 0;

  /** Вихід із розмови: список перечитуємо — у ній зник бейдж і змінився останок. */
  function closeThread(): void {
    setOpenPeerId(null);
    void reload();
  }

  return (
    <div className="wb-page">
      {/* Шапка й смуга їдуть разом і лишаються на видноті (`.wb-page-sticky`):
          список довгий, і без цього й пошук, і фільтри зникали рівно тоді, коли
          вони потрібні. */}
      <div className="wb-page-sticky">
        <div className="wb-page-head">
          <h1 className="wb-page-title">Повідомлення</h1>
        </div>

        {hasConversations && (
          <MessagesToolbar
            view={view}
            onChange={(patch) => setView((prev) => ({ ...prev, ...patch }))}
            shown={visible.length}
            total={conversations.length}
          />
        )}
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
          groups={groups}
          total={conversations.length}
          meId={meId}
          onOpen={(peerId) => setOpenPeerId(peerId)}
          collection={{ layout: view.layout, columns: view.columns }}
          // Скидання — це повернення до типового вигляду цілком: людина не
          // пам'ятає, що саме вона навибирала, коли список спорожнів.
          onReset={() => setView(DEFAULT_MESSAGES_VIEW)}
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
