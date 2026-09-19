/**
 * Правила списку контактів — чисті функції, без React і без стану.
 *
 * Пошук, фільтр, сортування й групування — це те, що вирішує, **чи знайде
 * людина свій контакт**. Тому вони живуть однією функцією на весь вигляд
 * (`buildContactGroups`), а не розсипом по розмітці: саме тут найлегше зламати
 * щось мовчки — «нічого не знайдено» виглядає однаково і коли фільтр
 * правильний, і коли він зламався.
 *
 * **Що тут контактне, а що спільне.** Тут лишається те, що знає про контакт:
 * за чим його шукати (ім'я, хендл, хештеги, примітки), як його сортувати й що
 * написати в чипі. А правила, однакові для будь-якого списку з хештегами, —
 * нормалізація запиту, «усі / без хештегів / вибрані теги», акцент на
 * знайденому тезі, «за днями» й складання чипів — живуть у спільному
 * `@wwwuabot/ui/collection`, тож нотатки й контакти шукають за тими самими
 * правилами, а не за двома схожими.
 *
 * @module @wwwuabot/ui/contacts
 */

import type { Contact } from "@wwwuabot/shared/contacts";
import { sqliteTimestamp } from "@wwwuabot/shared/utils/datetime";
import {
  DAY_BUCKETS,
  UNTAGGED_LABEL,
  buildTagChips,
  buildViewChips,
  dayBucket,
  hitTags,
  matchesTagFilter,
  queryWords,
  selectedTags,
  uniqueTags,
} from "../collection";
import { DEFAULT_CONTACTS_VIEW } from "./types";
import type {
  ContactsChip,
  ContactsGroup,
  ContactsGroupBy,
  ContactsSort,
  ContactsView,
} from "./types";

/** Варіанти сортування — дані для пікера, а не розмітка. */
export const CONTACT_SORT_OPTIONS: readonly {
  value: ContactsSort;
  label: string;
  short: string;
}[] = [
  { value: "updated-desc", label: "Спочатку змінені", short: "Змінені" },
  { value: "created-desc", label: "Спочатку нові", short: "Нові" },
  { value: "created-asc", label: "Спочатку найстаріші", short: "Найстаріші" },
  { value: "name", label: "За іменем, за абеткою", short: "За іменем" },
];

/** Варіанти групування — теж дані. */
export const CONTACT_GROUP_OPTIONS: readonly {
  value: ContactsGroupBy;
  label: string;
  short: string;
}[] = [
  { value: "day", label: "За днями", short: "За днями" },
  { value: "tag", label: "За хештегами", short: "За тегами" },
  { value: "none", label: "Без груп", short: "Без груп" },
];

/** Усі хештеги списку — за абеткою. Для фільтра. */
export function collectContactTags(contacts: readonly Contact[]): string[] {
  return uniqueTags(contacts.map((contact) => contact.tags));
}

/**
 * Чи проходить контакт пошук.
 *
 * Шукаємо там, де контакт можна впізнати: ім'я, `@хендл`, хештеги й примітки.
 * Telegram-id у пошук **не** входить навмисно: його власник не знає (id бачить
 * бот), тож шукати за ним означало б шукати за тим, чого в списку не видно.
 *
 * Слова з'єднуються через «і», а не «або»: «карась київ» має знайти контакт, де
 * є обидва, а не все, де є хоч одне.
 */
function matchesQuery(contact: Contact, words: readonly string[]): boolean {
  if (words.length === 0) return true;
  const haystack =
    `${contact.name} ${contact.username ?? ""} ${contact.notes} ${contact.tags.join(" ")}`.toLocaleLowerCase(
      "uk-UA",
    );
  return words.every((word) => haystack.includes(word));
}

/** Сортує контакти за вибраним порядком. Повертає **новий** масив. */
export function sortContacts(contacts: readonly Contact[], sort: ContactsSort): Contact[] {
  const sorted = [...contacts];
  switch (sort) {
    case "created-desc":
      return sorted.sort((a, b) => sqliteTimestamp(b.createdAt) - sqliteTimestamp(a.createdAt));
    case "created-asc":
      return sorted.sort((a, b) => sqliteTimestamp(a.createdAt) - sqliteTimestamp(b.createdAt));
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "uk"));
    case "updated-desc":
    default:
      return sorted.sort((a, b) => sqliteTimestamp(b.updatedAt) - sqliteTimestamp(a.updatedAt));
  }
}

/** Контакти, які проходять пошук і фільтр, у вибраному порядку. */
export function filterContacts(contacts: readonly Contact[], view: ContactsView): Contact[] {
  const words = queryWords(view.query);
  const kept = contacts.filter(
    (contact) => matchesQuery(contact, words) && matchesTagFilter(contact.tags, view.tags),
  );
  return sortContacts(kept, view.sort);
}

/**
 * Хештеги, які **знайшов** поточний пошук або фільтр.
 *
 * Це різниця між «тег є в контакті» і «тег і є тим, що шукали»: у стовпчику
 * однакових приглушених підписів око не бачить, за що зачепився пошук. Нічого
 * не шукали — нічого й не знайдено: акцентувати всі теги означало б акцентувати
 * ніщо.
 */
export function foundContactTags(tags: readonly string[], view: ContactsView): string[] {
  return hitTags(tags, queryWords(view.query), selectedTags(view.tags));
}

/**
 * Чипи смуги керування — вибране, яке видно й прибирається дотиком.
 *
 * Складає їх спільне правило: тут лишаються **контактні** варіанти — «Нові»,
 * «За днями» — і слово «контакти» в підписі.
 */
export function contactViewChips(view: ContactsView): ContactsChip[] {
  return buildViewChips(view, {
    defaults: DEFAULT_CONTACTS_VIEW,
    sortOptions: CONTACT_SORT_OPTIONS,
    groupOptions: CONTACT_GROUP_OPTIONS,
    itemWord: "контакти",
    // Звужує список тут саме фільтр за хештегами — його чипи й подаємо.
    filter: (current) => buildTagChips(current.tags, "контакти"),
  });
}

/**
 * Складає список у групи за вибраним правилом.
 *
 * Групує за датою **зміни**: список відкривають, щоб знайти те, з чим працювали
 * нещодавно, і саме цю дату видно в рядку (та сама логіка, що в нотатках).
 *
 * `now` — аргумент, а не `new Date()` усередині: інакше «Сьогодні» залежало б
 * від моменту виклику, і перевірити це тестом було б неможливо.
 */
export function buildContactGroups(
  contacts: readonly Contact[],
  view: ContactsView,
  now: number = Date.now(),
): ContactsGroup[] {
  const visible = filterContacts(contacts, view);

  if (view.groupBy === "none") {
    return visible.length === 0 ? [] : [{ key: "all", label: "Усі контакти", contacts: visible }];
  }

  if (view.groupBy === "day") {
    return DAY_BUCKETS.map((bucket) => ({
      key: `day:${bucket.key}`,
      label: bucket.label,
      contacts: visible.filter(
        (contact) => dayBucket(sqliteTimestamp(contact.updatedAt), now) === bucket.key,
      ),
    })).filter((group) => group.contacts.length > 0);
  }

  // Групування за хештегами: контакт із кількома тегами чесно стоїть у кожній
  // своїй групі — це вигляд «хто під цим тегом», а не друга копія даних.
  const groups: ContactsGroup[] = collectContactTags(visible).map((tag) => ({
    key: `tag:${tag}`,
    label: `#${tag}`,
    contacts: visible.filter((contact) => contact.tags.includes(tag)),
  }));
  const untagged = visible.filter((contact) => contact.tags.length === 0);
  if (untagged.length > 0) {
    groups.push({ key: "tag:__none__", label: UNTAGGED_LABEL, contacts: untagged });
  }
  return groups;
}
