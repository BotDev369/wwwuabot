/**
 * Суб'єкт аналізу: **кого або що** ми читаємо. Вид їде адресою (`?kind=`) і
 * змінює трактування, а не розрахунок: формула та сама, тексти різні — саме
 * тому подія не отримує опис характеру. `mixed` — не третій вид, а режим
 * порівняння, де в таблиці стоять і люди, і події.
 * Правила й входи — `docs/ANALYSIS.md`.
 *
 * @module @wwwuabot/shared/content/analysis-subject
 */

/** Види суб'єкта, для яких є власне трактування. */
export const SUBJECT_KINDS = ["person", "event"] as const;

export type SubjectKind = (typeof SUBJECT_KINDS)[number];

/** Режим таблиці: один вид суб'єкта або обидва разом. */
export type AnalysisScope = SubjectKind | "mixed";

/** Ім'я параметра адреси: вид суб'єкта. */
export const SUBJECT_QUERY = "kind";

/** Ім'я параметра адреси: підписи суб'єктів, по одному на дату. */
export const SUBJECT_LABELS_QUERY = "labels";

/** Ім'я параметра адреси: аналіз себе. */
export const SELF_QUERY = "self";

export function isSubjectKind(value: unknown): value is SubjectKind {
  return typeof value === "string" && (SUBJECT_KINDS as readonly string[]).includes(value);
}

/**
 * Вид із адреси. Невідоме значення — не помилка: посилання, збережене до появи
 * видів, веде на людину, бо це типовий випадок, а не порожній екран.
 */
export function parseScope(value: string | null | undefined): AnalysisScope {
  if (value === "mixed") return "mixed";
  return isSubjectKind(value) ? value : "person";
}

/**
 * Вид на кожну дату — з одного параметра адреси.
 *
 * Однаковий вид пише одне слово (`kind=person`), змішаний — перелік, по
 * одному на дату (`kind=person,event`). Так адреса лишається читабельною там,
 * де вид один (а це всі входи, крім порівняння людей із подіями), і не втрачає
 * розрізнення там, де воно є.
 */
export function parseScopes(raw: string | null | undefined, count: number): SubjectKind[] {
  const parts = (raw ?? "").split(",").filter(Boolean);
  if (count <= 0) return [];
  if (parts.length <= 1) {
    const only = parseScope(parts[0]);
    const kind: SubjectKind = only === "mixed" ? "person" : only;
    return Array.from({ length: count }, () => kind);
  }
  return Array.from({ length: count }, (_, index) => {
    const parsed = parseScope(parts[index]);
    return parsed === "event" ? "event" : "person";
  });
}

/** Спільний вид переліку: різні види — це `mixed`, а не «перший-ліпший». */
export function scopeOf(kinds: readonly SubjectKind[]): AnalysisScope {
  if (kinds.length === 0) return "person";
  return kinds.every((kind) => kind === kinds[0]) ? kinds[0] : "mixed";
}

/** Зворотний бік `parseScopes`: одне слово, якщо вид спільний. */
export function encodeScopes(kinds: readonly SubjectKind[]): string {
  const scope = scopeOf(kinds);
  return scope === "mixed" ? kinds.join(",") : scope;
}

/** Підпис над результатом: що саме зараз читають. */
export function scopeTitle(scope: AnalysisScope): string {
  if (scope === "mixed") return "Аналіз людей і подій";
  return scope === "event" ? "Аналіз події" : "Аналіз людини";
}

/** Підпис стовпця/рядка в таблиці, де стоїть сам суб'єкт. */
export function scopeColumnTitle(scope: AnalysisScope): string {
  if (scope === "mixed") return "Суб'єкт";
  return scope === "event" ? "Подія" : "Людина";
}

/** Множина — для перемикача вигляду й заголовків списків. */
export function scopePlural(scope: AnalysisScope): string {
  if (scope === "mixed") return "Суб'єкти";
  return scope === "event" ? "Події" : "Люди";
}

/**
 * Що саме читаємо — одним рядком над таблицею. Це не прикраса: людина мусить
 * бачити, що текст написано про подію, а не про її характер.
 */
export function scopeLead(scope: AnalysisScope, self: boolean): string {
  if (self && scope === "person") return "Читаємо вас: ваш характер, ресурси й слабкі місця.";
  if (scope === "mixed")
    return "Читаємо кожного суб'єкта окремо: людей — як характер, події — як тон і наслідок.";
  return scope === "event"
    ? "Читаємо подію: її тон, рушій і те, чим вона завершується."
    : "Читаємо людину: характер, ресурси й слабкі місця.";
}

/**
 * Розділювач підписів — вертикальна риска, а не кома.
 *
 * Ім'я людини може містити кому («Олена, сестра»), і тоді кома-розділювач
 * зсунула б усі наступні підписи до чужих дат. Риска в іменах не трапляється,
 * а `URLSearchParams` кодує й декодує її сам, тож окремого кодування кожного
 * підпису не треба: подвійне кодування ламало б кирилицю.
 */
export const SUBJECT_LABEL_SEPARATOR = "|";

/** Підписи суб'єктів з адреси: по одному на дату, у тому ж порядку. */
export function parseLabels(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(SUBJECT_LABEL_SEPARATOR).map((item) => item.trim());
}

/** Той самий перелік підписів у параметр адреси. */
export function encodeLabels(labels: readonly string[]): string {
  return labels
    .map((label) => label.split(SUBJECT_LABEL_SEPARATOR).join(" ").trim())
    .join(SUBJECT_LABEL_SEPARATOR);
}
