/**
 * Правила дошки — чисті функції: пошук, фільтри й чипи.
 *
 * Тут те, що знає про **оголошення**: за чим його шукати, як звуться види, чиє
 * воно буває й що написати на чипі. Правила смуги (пошук як один контрол,
 * клітинки-знаки, повноекранні вибори) — у спільному `@wwwuabot/ui/collection`,
 * а **склад виборів** — тут: смуга не мусить знати ні слова «оголошення», ні
 * видів із `AD_KINDS` (правило 18).
 *
 * **Порядку в пікері немає навмисно.** Він іде з бази — свіжіші першими, і
 * чернетки попереду решти (див. `ads-list`); пікер «за датою» був би другою
 * правдою про те саме «що новіше», і одна з двох розійшлася б із іншою тихо.
 *
 * @module web-platform-dev/src/pages/ads-view
 */

import { AD_KIND_LABELS, AD_KINDS, adKindLabel, type Ad, type AdKind } from "@wwwuabot/shared/ads";
import {
  DEFAULT_COLLECTION_VIEW,
  collectionViewShort,
  queryWords,
  type CollectionColumns,
  type CollectionLayout,
} from "@wwwuabot/ui/collection";
import type { SpaceAd } from "./ads-list";

/** Чиє оголошення показуємо: усе, своє (разом із чернетками) або лише чернетки. */
export type AdsWhose = "all" | "mine" | "drafts";

export interface AdsView {
  query: string;
  /** `all` — усі види; інакше — один із закритого списку `AD_KINDS`. */
  kind: AdKind | "all";
  whose: AdsWhose;
  layout: CollectionLayout;
  columns: CollectionColumns;
}

/** Типові значення — ними ж чипи повертають вибір назад: одне місце на обидві дії. */
export const DEFAULT_ADS_KIND: AdKind | "all" = "all";
export const DEFAULT_ADS_WHOSE: AdsWhose = "all";

export const DEFAULT_ADS_VIEW: AdsView = {
  query: "",
  kind: DEFAULT_ADS_KIND,
  whose: DEFAULT_ADS_WHOSE,
  ...DEFAULT_COLLECTION_VIEW,
};

/**
 * Чиї оголошення бувають — дані для пікера.
 *
 * `short` іде на чип (там довгий підпис не влазить), `label` — у список вибору
 * й у назву вибору для читача з екрана.
 */
export const ADS_WHOSE_OPTIONS: readonly { value: AdsWhose; label: string; short: string }[] = [
  { value: "all", label: "Усі оголошення на дошці", short: "Усі" },
  { value: "mine", label: "Лише мої", short: "Мої" },
  { value: "drafts", label: "Лише чернетки", short: "Чернетки" },
];

/** Чип вибраного: один вибір, який видно очима й знімають дотиком. */
export interface AdsChip {
  key: string;
  label: string;
  action: string;
  reset: Partial<AdsView>;
}

/**
 * Чи проходить оголошення пошук.
 *
 * Слова запиту з'єднуються через «і»: «телевізор київ» мусить знайти оголошення,
 * де є обидва, а не все, де є хоч одне — інакше пошук віддає більше, ніж
 * просили, і це виглядає як «шукає не те». Підпис виду теж у пошуку: людина
 * пише «продам», а не `sell`.
 */
function matchesQuery(ad: Ad, words: readonly string[]): boolean {
  if (words.length === 0) return true;
  const haystack = [ad.title, ad.body, ad.price, ad.place, adKindLabel(ad.kind)]
    .join(" ")
    .toLocaleLowerCase("uk-UA");
  return words.every((word) => haystack.includes(word));
}

/**
 * Види, які **справді є** в списку, — у порядку `AD_KINDS`.
 *
 * Порожній пункт фільтра читався б як «тут нічого немає» — а це неправда про
 * дошку, лише про цю добірку.
 */
export function adsKinds(items: readonly SpaceAd[]): AdKind[] {
  const found = new Set<AdKind>();
  for (const { ad } of items) {
    if (AD_KINDS.includes(ad.kind)) found.add(ad.kind);
  }
  return AD_KINDS.filter((kind) => found.has(kind));
}

/**
 * Оголошення, які проходять пошук і фільтри.
 *
 * Порядок не змінюється: його дала база разом із чернетками попереду — і саме
 * тому «моє» тут фільтр, а не перестановка.
 */
export function filterAds(items: readonly SpaceAd[], view: AdsView): SpaceAd[] {
  const words = queryWords(view.query);

  return items.filter(({ ad, mine }) => {
    // «Лише мої» й «лише чернетки» — про власника: чуже не показуємо в обох.
    if (!mine && view.whose !== "all") return false;
    if (view.whose === "drafts" && ad.isActive) return false;
    if (view.kind !== "all" && ad.kind !== view.kind) return false;
    return matchesQuery(ad, words);
  });
}

/**
 * Чипи смуги — вибране, яке видно й прибирається дотиком.
 *
 * Складає їх **цей** модуль, а не спільний `buildViewChips`: тому потрібні
 * `sort` і `groupBy`, а в дошки їх немає (див. шапку файлу) — і вигадувати
 * «порядок», якого не існує, щоб підійти під спільну функцію, означало б
 * завести в моделі мертве поле.
 */
export function adsChips(view: AdsView): AdsChip[] {
  const chips: AdsChip[] = [];
  const query = view.query.trim();

  if (query) {
    chips.push({
      key: "query",
      label: `«${query}»`,
      action: `Прибрати пошук «${query}»`,
      reset: { query: "" },
    });
  }

  // `!== "all"` замість порівняння зі сталою: саме так TS звужує об'єднання до
  // `AdKind`, і підпис виду не доводиться брати через `adKindLabel`.
  if (view.kind !== "all") {
    const label = AD_KIND_LABELS[view.kind];
    chips.push({
      key: "kind",
      label,
      action: `Показати всі види (зараз — ${label})`,
      reset: { kind: DEFAULT_ADS_KIND },
    });
  }

  const whose = ADS_WHOSE_OPTIONS.find((option) => option.value === view.whose);
  if (view.whose !== DEFAULT_ADS_WHOSE && whose) {
    chips.push({
      key: "whose",
      label: whose.short,
      action: `Показати всі оголошення (зараз — ${whose.short})`,
      reset: { whose: DEFAULT_ADS_WHOSE },
    });
  }

  if (view.layout !== DEFAULT_ADS_VIEW.layout) {
    chips.push({
      key: "layout",
      label: collectionViewShort(view),
      action: `Повернути звичайний список (${collectionViewShort(DEFAULT_ADS_VIEW)})`,
      reset: { layout: DEFAULT_ADS_VIEW.layout, columns: DEFAULT_ADS_VIEW.columns },
    });
  }

  return chips;
}
