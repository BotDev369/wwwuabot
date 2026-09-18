/**
 * Хештеги як фільтр і як пошук — **спільне правило для будь-якого списку**.
 *
 * У нотаток і в контактів хештеги лежать однаково (`@wwwuabot/shared/tags`), і
 * шукають їх однаково: слова запиту з'єднуються через «і», вибрані теги — теж
 * «і», а «уже» знайдений тег стає акцентним. Тому це один модуль, а не два
 * набори, що тихо розійдуться: правило «#Київ нічого не знайшов» виглядає
 * однаково зламаним в обох списках.
 *
 * Нормалізація пошуку та сама, що в базі: хештеги зберігаються нижнім регістром
 * і без `#`, тож і запит читається так само — інакше «#Київ» не знайшов би
 * нічого, хоч тег є.
 *
 * @module @wwwuabot/ui/collection
 */

/**
 * Фільтр за хештегами.
 *
 * Тегів можна вибрати **кілька**, і елемент мусить мати **кожен** із них: вибір
 * звужує список, а не розширює — так само, як пошук вимагає всі слова.
 * Порядок сталий (за абеткою): з нього будується і чип, і підпис для
 * скрінрідера, тож він не має залежати від того, у якому порядку тицяли.
 *
 * Це не `string | null`: «усі», «без хештегів» і вибрані теги — три різні речі,
 * і рядок-сентевел для «без хештегів» рано чи пізно зіткнувся б із справжнім
 * тегом (нормалізація не забороняє майже жодного символу).
 *
 * Порожнього списку тегів тут немає навмисно: прибрати останній тег — це
 * повернутись до «усі», а не лишитись із фільтром, який нічого не фільтрує.
 */
export type CollectionTagFilter =
  { kind: "all" } | { kind: "untagged" } | { kind: "tags"; tags: readonly string[] };

/** Типовий фільтр — «усі»: список показують цілком, доки його не звузили. */
export const DEFAULT_TAG_FILTER: CollectionTagFilter = { kind: "all" };

/** Підпис «без хештегів» — той самий і в списку, і у фільтрі, і в чипі. */
export const UNTAGGED_LABEL = "Без хештегів";

/** Теги, вибрані зараз. «Усі» й «без хештегів» — не теги, тож список порожній. */
export function selectedTags(filter: CollectionTagFilter): string[] {
  return filter.kind === "tags" ? [...filter.tags] : [];
}

/**
 * Перемикає **один** тег: дотик додає його або прибирає, решти не чіпаючи.
 *
 * Саме на цьому тримається мультивибір: без «прибрати один, не втративши
 * решти» вибір був би одноразовим. Коли прибрано останній тег — фільтр
 * вертається до «усі», а не лишається порожнім списком: порожній вибір і «усі»
 * виглядали б однаково, але поводились би по-різному (порожній чип без підпису,
 * клітинка без стану).
 *
 * Порядок — за абеткою, той самий, у якому теги стоять у пікері: інакше чипи
 * переставлялись би місцями від самого лише порядку дотиків.
 */
export function toggleTagFilter(filter: CollectionTagFilter, tag: string): CollectionTagFilter {
  const current = selectedTags(filter);
  const next = current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag];
  if (next.length === 0) return DEFAULT_TAG_FILTER;
  return { kind: "tags", tags: next.sort((a, b) => a.localeCompare(b, "uk")) };
}

/** Фільтр словами: те, що читає скрінрідер у клітинці, де видно лише знак. */
export function tagFilterLabel(filter: CollectionTagFilter): string {
  if (filter.kind === "all") return "Усі теги";
  if (filter.kind === "untagged") return UNTAGGED_LABEL;
  return filter.tags.map((tag) => `#${tag}`).join(", ");
}

/**
 * Чи проходить елемент фільтр за хештегами.
 *
 * На вхід — **саме теги елемента**, а не елемент: правило одне на нотатку й
 * контакт, і воно не має знати, у якому полі лежать теги.
 */
export function matchesTagFilter(tags: readonly string[], filter: CollectionTagFilter): boolean {
  if (filter.kind === "all") return true;
  if (filter.kind === "untagged") return tags.length === 0;
  return filter.tags.every((tag) => tags.includes(tag));
}

/** Слова запиту: нижній регістр, `#` не має значення (у базі тегів він і так немає). */
export function queryWords(query: string): string[] {
  return query.toLocaleLowerCase("uk-UA").replace(/#/g, " ").split(/\s+/).filter(Boolean);
}

/** Усі хештеги списку — за абеткою. Для фільтра й для пікера. */
export function uniqueTags(lists: readonly (readonly string[])[]): string[] {
  const tags = new Set<string>();
  for (const list of lists) for (const tag of list) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b, "uk"));
}

/**
 * Хештеги, які **знайшов** поточний пошук або фільтр.
 *
 * Це різниця між «тег є в елементі» і «тег і є тим, що шукали»: у стовпчику
 * однакових приглушених підписів око не бачить, за що зачепився пошук. Тому
 * список виділяє знайдене акцентом — і коли тег знайшов пошук (слово запиту в
 * ньому), і коли він вибраний у фільтрі.
 *
 * Нічого не шукали — нічого й не знайдено: **порожній список**. Акцентувати
 * всі теги, коли пошуку немає, означало б акцентувати ніщо: акцент каже про
 * дію, а не про наявність.
 */
export function hitTags(
  tags: readonly string[],
  words: readonly string[],
  chosen: readonly string[],
): string[] {
  return tags.filter((tag) => chosen.includes(tag) || words.some((word) => tag.includes(word)));
}
