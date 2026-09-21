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
 * **Нове повідомлення — форма, а не перехід у розмову.** «+» відкриває
 * `NewMessageSheet` (кому + тіло) з можливістю зберегти чернетку: написати
 * першим — це **робота**, а не мить, і чернетка мусить мати де жити.
 *
 * **Чернетки — своїм блоком** (`DraftList`), а не рядком розмови: ненадісланий
 * лист не належить розмові (в нього може не бути адресата, а одній людині
 * чернеток буває кілька), і дотик до такого рядка веде **у форму**, а не в
 * розмову — там composer починається з порожнього поля, тож текст лишився б
 * невидимим.
 *
 * **«+» завжди відкриває чистий лист.** Форму з чернеткою відкриває її рядок, і
 * це єдиний вхід у неї: підставляти найсвіжу чернетку в «новий лист» означало б
 * вирішувати за людину, що вона пише.
 *
 * **Розмова відкривається поверхнею**, а не окремим маршрутом: футер лишається
 * хромом і видно, що ти в застосунку, а «назад» повертає до списку.
 *
 * **Адреса розмови — це вхід, а не стан.** Бот веде сюди за запрошенням
 * (`/messages?peer=<id>`, спільний `messagesPeerPath`), і номер із адреси лише
 * відкриває розмову один раз: далі нею керує стан екрана, тож закриття розмови
 * не «повертає» її знову з того самого посилання.
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
import { useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useCreateForm } from "@/app/useCreateForm";
import {
  MESSAGES_PEER_PARAM,
  readMessagesPeer,
  type MessageDraft,
  type MessageDraftInput,
} from "@wwwuabot/shared/messages";
import {
  ConversationList,
  DEFAULT_MESSAGES_VIEW,
  DraftList,
  MessagesToolbar,
  NewMessageSheet,
  ThreadSheet,
  buildConversationGroups,
  filterConversations,
  type MessagesView,
} from "@wwwuabot/ui/messages";
import { useDialog } from "@wwwuabot/ui/dialog";
import { useCompose } from "./useCompose";
import { useConversations } from "./useConversations";
import { useProfile } from "./useProfile";
import { useThread } from "./useThread";

export function MessagesPage(): ReactElement {
  const { conversations, loading, error, reload } = useConversations();
  const compose = useCompose();
  const dialog = useDialog();
  const { profile } = useProfile();
  // Вигляд списку — стан **екрана**, а не даних: сервер віддає ті самі розмови,
  // а те, як їх показати, вирішує той, хто дивиться.
  const [view, setView] = useState<MessagesView>(DEFAULT_MESSAGES_VIEW);
  // Початкова розмова — з адреси, і лише початкова: `useState` бере її один
  // раз, тож зміна адреси сама собою нічого не перевідкриває.
  const [searchParams] = useSearchParams();
  const [openPeerId, setOpenPeerId] = useState<number | null>(() =>
    readMessagesPeer(searchParams.get(MESSAGES_PEER_PARAM)),
  );
  // Який лист відкрито у формі: `draft` — правка чернетки, `null` — новий.
  // Це стан **екрана**: сама форма нічого не змінює в даних, а чернетку їй дає
  // рядок списку, з якого її відкрили.
  //
  // «+» екрана відкриває форму, і тримає її `useCreateForm`: «назад» її
  // закриває, а людина лишається в «Повідомленнях». Хаб «Створити» бере ту
  // саму форму своїм `MessageCreateSheet` — поверхнею на хабі, без переходу.
  // Правка чернетки — тут: вона завжди про конкретний рядок, і рядок уже є в
  // списку.
  const form = useCreateForm();
  const [composing, setComposing] = useState<{ draft: MessageDraft | null } | null>(null);
  const composeOpen = form.open || composing !== null;
  const thread = useThread(openPeerId);
  const meId = profile?.id ?? 0;

  const groups = buildConversationGroups(conversations, view);
  const visible = filterConversations(conversations, view);

  /**
   * Вихід із розмови: список перечитуємо — у ній зник бейдж і змінився останок.
   *
   * Заразом перечитуємо й форму: отримувачі — це зв'язані контакти, а зв'язок
   * з'являється не від наших дій (хтось прийшов за посиланням), тож це саме той
   * момент, коли список міг змінитися сам.
   */
  function closeThread(): void {
    setOpenPeerId(null);
    void reload();
    void compose.reload();
  }

  /**
   * Відкрити форму — **чистим листом**.
   *
   * «+» — це «написати нове», і саме так воно й мусить читатись: чернетки чекають
   * у своєму блоці, і жодна з них не має права підставитись у новий лист.
   */
  async function openCompose(): Promise<void> {
    if (compose.error) {
      await dialog.alert(compose.error, { tone: "danger" });
      return;
    }
    setComposing(null);
    form.openForm();
  }

  /** Закрити форму: правку чернетки скидаємо, форму вертаємо в адресі. */
  function closeCompose(): void {
    setComposing(null);
    form.closeForm();
  }

  /** Дотик до рядка розмови — як був: розмова відкривається поверхнею. */
  function openConversation(peerId: number): void {
    setOpenPeerId(peerId);
  }

  /** Дотик до рядка чернетки — у **форму**, з нею самою всередині. */
  function openDraft(draft: MessageDraft): void {
    setComposing({ draft });
  }

  /**
   * Надіслати з форми — і **показати, куди лист пішов**.
   *
   * Надсилання тут, а не у формі: `NewMessageSheet` лише повідомляє про дотик,
   * як і розмова. Відкриття розмови після успіху — продовження тієї самої дії:
   * людина написала першою, тож мусить побачити, що лист справді пішов.
   *
   * Номер чернетки їде разом із листом: сервер прибирає **саме її** — решта
   * чернеток це те, що людина ще пише, і чипати їх надсилання не має права.
   */
  async function sendNew(input: MessageDraftInput): Promise<boolean> {
    if (input.peerId === null) return false; // кнопка на такому листі гасне

    // Надсилає спільний хук (`useCompose.send`): він і чернетку прибирає, і
    // перечитує список — надіслана не мусить лишатись у ньому рядком.
    const message = await compose.send(input);
    if (!message) {
      await dialog.alert(compose.error ?? "Не вдалося надіслати повідомлення", {
        tone: "danger",
      });
      return false;
    }

    setOpenPeerId(input.peerId);
    void reload();
    return true;
  }

  /**
   * Зберегти чернетку: форма закриється лише тоді, коли сервер підтвердив.
   *
   * Список перечитуємо після успіху: чернетку **видно** рядком у ньому, а рядки
   * приходять із сервера разом із розмовами — тож без перечитування новий рядок
   * з'явився б аж наступного разу.
   */
  async function saveDraft(input: MessageDraftInput): Promise<boolean> {
    if (!(await compose.saveDraft(input))) {
      await dialog.alert(compose.error ?? "Не вдалося зберегти чернетку", { tone: "danger" });
      return false;
    }

    void reload();
    return true;
  }

  /**
   * Прибрати чернетку — **з підтвердженням**, бо текст ще нікуди не пішов.
   *
   * Підтвердження питає оболонка, а не форма: це та сама межа, що з чисткою
   * розмови — поверхня лише каже, що її покликали (`useDialog`, §4).
   *
   * Другого правила «як зникає чернетка» не заводимо: порожнє тіло прибирає її
   * за номером **на сервері** (`saveDraft` у `api-dev`) — тож шлях той самий, а
   * дія названа окремо лише тому, що людина не мусить здогадуватись, що для
   * цього треба стерти все поле.
   */
  async function deleteDraft(draftId: number): Promise<boolean> {
    const yes = await dialog.confirm(
      "Ненадісланий текст зникне — його немає ні в кого, крім вас.",
      {
        title: "Видалити чернетку?",
        tone: "danger",
        confirmText: "Видалити",
      },
    );
    if (!yes) return false;

    return saveDraft({ id: draftId, peerId: null, body: "" });
  }

  /**
   * Стерти переписку — **в обох**, тож питаємо перед тим, як робити.
   *
   * Підтвердження обов'язкове саме тому, що дія незворотна й чужа: людина
   * стирає не свої копії, а спільний рядок переписки. Помічник — спільний
   * `useDialog`, а не `window.confirm`: у Telegram Mini App на iOS його не
   * існує, і підтвердження повернуло б `false` назавжди (§4).
   *
   * Список перечитуємо після успіху: у рядку розмови стояв текст, якого більше
   * немає.
   */
  async function clearHistory(): Promise<void> {
    const yes = await dialog.confirm(
      "Історія зникне в обох — у вас і в співрозмовника. Це незворотно.",
      { title: "Стерти переписку?", tone: "danger", confirmText: "Стерти" },
    );
    if (!yes) return;

    if (await thread.clear()) void reload();
  }

  /**
   * Прибрати розмову — інша дія, ніж чистка, і не «сильніша».
   *
   * Чистка лишає порожню розмову на місці, а ця прибирає її зі списку в того,
   * хто натиснув; історія ж стирається в обох, бо вона спільна. Тому після
   * успіху поверхня закривається: лишатися в розмові, якої у списку більше
   * немає, означало б показувати порожній екран від неї.
   */
  async function deleteThread(): Promise<void> {
    const yes = await dialog.confirm(
      "Чат зникне зі списку в обох, листування стерто. Повернеться, коли хтось напише.",
      { title: "Прибрати розмову?", tone: "danger", confirmText: "Видалити" },
    );
    if (!yes) return;

    if (await thread.remove()) closeThread();
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

        {/* Смуга керування — це **хром екрана, а не вміст** (тому вона тут, а
            не під списком): «+» — єдина дія, якою починають листування, і
            ховати її разом зі списком означало б лишати порожній екран без
            виходу — саме так і сталося. Порожній список — це стан, який вона ж
            і пояснює (`ConversationList`). */}
        {!loading && !error && (
          <MessagesToolbar
            view={view}
            onChange={(patch) => setView((prev) => ({ ...prev, ...patch }))}
            shown={visible.length}
            total={conversations.length}
            onNew={() => void openCompose()}
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

      {/* Чернетки стоять **над розмовами** й окремим блоком: вони не належать
          жодній із них — лист буває й без адресата, а одній людині чернеток
          буває кілька. Блоку немає, коли чернеток немає (`DraftList`). */}
      {!loading && !error && (
        <DraftList
          drafts={compose.drafts}
          peers={compose.recipients}
          onOpen={openDraft}
          collection={{ layout: view.layout, columns: view.columns }}
        />
      )}

      {!loading && !error && (
        <ConversationList
          groups={groups}
          total={conversations.length}
          meId={meId}
          onOpen={openConversation}
          collection={{ layout: view.layout, columns: view.columns }}
          // Скидання — це повернення до типового вигляду цілком: людина не
          // пам'ятає, що саме вона навибирала, коли список спорожнів.
          onReset={() => setView(DEFAULT_MESSAGES_VIEW)}
        />
      )}

      {/* Форма з'являється лише тоді, коли адресати справді приїхали: під час
          завантаження поле «Кому» показало б «без отримувача» — а це неправда,
          у якої немає виправдання (список дрібний і приходить одразу). */}
      {composeOpen && !compose.loading && (
        <NewMessageSheet
          recipients={compose.recipients}
          draft={composing?.draft ?? null}
          onSaveDraft={saveDraft}
          onSend={sendNew}
          onDeleteDraft={deleteDraft}
          onClose={closeCompose}
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
          onClear={() => void clearHistory()}
          onDelete={() => void deleteThread()}
          onClose={closeThread}
        />
      )}
    </div>
  );
}
