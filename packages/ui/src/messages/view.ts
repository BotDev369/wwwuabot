/**
 * Правила списку розмов — чисті функції, без React і без стану.
 *
 * Пошук, фільтр, порядок і групи — це те, що вирішує, **чи знайде людина свою
 * розмову**. Тому вони живуть однією функцією на весь вигляд
 * (`buildConversationGroups`), а не розсипом по розмітці: саме тут найлегше
 * зламати щось мовчки — «нічого не знайдено» виглядає однаково і коли фільтр
 * правильний, і коли він зламався.
 *
 * **Що тут конверсаційне, а що спільне.** Тут лишається те, що знає про
 * розмову: за чим її шукати, як її сортувати й що написати в чипі. А правила,
 * однакові для будь-якого списку з виглядом, — складання чипів, вибір розкладки
 * й «за днями» — живуть у спільному `@wwwuabot/ui/collection`, тож нотатки,
 * контакти й повідомлення поводяться за тими самими правилами.
 *
 * @module @wwwuabot/ui/messages
 */

import type { Conversation } from "@wwwuabot/shared/messages";
import { peerLabel } from "@wwwuabot/shared/messages";
import { sqliteTimestamp } from "@wwwuabot/shared/utils/datetime";
import { DAY_BUCKETS, buildViewChips, dayBucket, queryWords } from "../collection";
import { DEFAULT_MESSAGES_VIEW } from "./types";
import type {
  MessagesChip,
  MessagesFilter,
  MessagesGroup,
  MessagesGroupBy,
  MessagesSort,
  MessagesView,
} from "./types";

/** Варіанти порядку — дані для пікера, а не розмітка. */
export const MESSAGE_SORT_OPTIONS: readonly {
  value: MessagesSort;
  label: string;
  short: string;
}[] = [
  { value: "recent", label: "Спочатку останні", short: "Останні" },
  { value: "unread", label: "Спочатку непрочитані", short: "Непрочитані" },
  { value: "name", label: "За іменем, за абеткою", short: "За іменем" },
];

/** Варіанти групування — теж дані. */
export const MESSAGE_GROUP_OPTIONS: readonly {
  value: MessagesGroupBy;
  label: string;
  short: string;
}[] = [
  { value: "none", label: "Без груп", short: "Без груп" },
  { value: "day", label: "За днями", short: "За днями" },
];

/** Варіанти фільтра — те, чим список звужують. */
export const MESSAGE_FILTER_OPTIONS: readonly {
  value: MessagesFilter;
  label: string;
  short: string;
}[] = [
  { value: "all", label: "Усі розмови", short: "Усі" },
  { value: "unread", label: "Тільки непрочитані", short: "Непрочитані" },
  { value: "empty", label: "Без повідомлень", short: "Порожні" },
];

/**
 * Заголовок групи для розмов, у яких ще немає жодного повідомлення.
 *
 * Дата в них відсутня, тож у «днях» вони не лежать — і без окремої групи
 * зникали б зі списку рівно тоді, коли їх увімкнули. А саме з них починають.
 */
export const EMPTY_THREADS_LABEL = "Ще без повідомлень";

/** Чи розмова проходить пошук. */
function matchesQuery(conversation: Conversation, words: readonly string[]): boolean {
  if (words.length === 0) return true;

  const { peer } = conversation;
  // Шукаємо і за підписом (він уже складений за пріоритетом імен), і за
  // кожним іменем окремо: людина може пам'ятати «@karas», хоч у рядку стоїть
  // ім'я, яке вона сама й дала.
  const haystack = [
    peerLabel(peer),
    peer.contactName ?? "",
    peer.platformUsername ?? "",
    peer.username ?? "",
    [peer.firstName, peer.lastName].filter(Boolean).join(" "),
    conversation.lastMessageText ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("uk-UA");

  return words.every((word) => haystack.includes(word));
}

/** Чи розмова проходить фільтр. */
function matchesFilter(conversation: Conversation, filter: MessagesFilter): boolean {
  if (filter === "unread") return conversation.unread > 0;
  if (filter === "empty") return conversation.lastMessageAt === null;
  return true;
}

/** Час останнього повідомлення; `0` — розмова ще не починалась. */
function lastTime(conversation: Conversation): number {
  return conversation.lastMessageAt ? sqliteTimestamp(conversation.lastMessageAt) : 0;
}

function byName(a: Conversation, b: Conversation): number {
  return peerLabel(a.peer).localeCompare(peerLabel(b.peer), "uk");
}

/**
 * Порядок за останнім повідомленням, а розмови без жодного — унизу й за
 * абеткою.
 *
 * Саме так, а не «нуль років тому»: розмова без повідомлень — це не найстаріша,
 * це та, якої ще немає, і місце їй під тими, де справді щось сказано. Порядок
 * між ними — за абеткою, бо дати в них немає жодної.
 */
function byRecent(a: Conversation, b: Conversation): number {
  const diff = lastTime(b) - lastTime(a);
  if (diff !== 0) return diff;
  if ((a.lastMessageAt === null) !== (b.lastMessageAt === null)) {
    return a.lastMessageAt === null ? 1 : -1;
  }
  return byName(a, b);
}

/** Сортує розмови за вибраним порядком. Повертає **новий** масив. */
export function sortConversations(
  conversations: readonly Conversation[],
  sort: MessagesSort,
): Conversation[] {
  const sorted = [...conversations];
  switch (sort) {
    case "name":
      return sorted.sort(byName);
    case "unread":
      // Непрочитані — не «порожні згори»: доки їх не прочитали, вони справді
      // перші. Усередині кожної половини порядок лишається часовим.
      return sorted.sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0) || byRecent(a, b));
    case "recent":
    default:
      return sorted.sort(byRecent);
  }
}

/** Розмови, які проходять пошук і фільтр, у вибраному порядку. */
export function filterConversations(
  conversations: readonly Conversation[],
  view: MessagesView,
): Conversation[] {
  const words = queryWords(view.query);
  const kept = conversations.filter(
    (conversation) => matchesQuery(conversation, words) && matchesFilter(conversation, view.filter),
  );
  return sortConversations(kept, view.sort);
}

/** Підпис варіанта фільтра — те саме, що стоїть у списку вибору. */
function filterShort(filter: MessagesFilter): string {
  return MESSAGE_FILTER_OPTIONS.find((option) => option.value === filter)?.short ?? filter;
}

/**
 * Чипи смуги керування — вибране, яке видно й прибирається дотиком.
 *
 * Складає їх спільне правило: тут лишається **конверсаційний** фільтр — «Усі»
 * нічого не звужує, тож чипа не має, а «непрочитані» й «порожні» — мають.
 */
export function conversationViewChips(view: MessagesView): MessagesChip[] {
  return buildViewChips(view, {
    defaults: DEFAULT_MESSAGES_VIEW,
    sortOptions: MESSAGE_SORT_OPTIONS,
    groupOptions: MESSAGE_GROUP_OPTIONS,
    itemWord: "розмови",
    filter: (current) =>
      current.filter === "all"
        ? []
        : [
            {
              key: "filter",
              label: filterShort(current.filter),
              action: "Показати всі розмови",
              reset: { filter: "all" },
            },
          ],
  });
}

/**
 * Складає список у групи за вибраним правилом.
 *
 * Групує за **останнім повідомленням**: список читають згори вниз, і «Сьогодні»
 * тут означає «сьогодні писали», а не «сьогодні завели розмову».
 *
 * `now` — аргумент, а не `new Date()` усередині: інакше «Сьогодні» залежало б
 * від моменту виклику, і перевірити це тестом було б неможливо.
 */
export function buildConversationGroups(
  conversations: readonly Conversation[],
  view: MessagesView,
  now: number = Date.now(),
): MessagesGroup[] {
  const visible = filterConversations(conversations, view);
  if (visible.length === 0) return [];

  if (view.groupBy === "none") {
    return [{ key: "none", label: "Усі розмови", conversations: visible }];
  }

  // Розмови без повідомлень — окремою групою **внизу**: дати в них немає, і
  // розкидати їх по «сьогодні» означало б вигадувати дату.
  const started = visible.filter((conversation) => conversation.lastMessageAt !== null);
  const empty = visible.filter((conversation) => conversation.lastMessageAt === null);

  const groups: MessagesGroup[] = DAY_BUCKETS.map((bucket) => ({
    key: `day:${bucket.key}`,
    label: bucket.label,
    conversations: started.filter(
      (conversation) => dayBucket(lastTime(conversation), now) === bucket.key,
    ),
  })).filter((group) => group.conversations.length > 0);

  if (empty.length > 0) {
    groups.push({ key: "day:empty", label: EMPTY_THREADS_LABEL, conversations: empty });
  }
  return groups;
}
