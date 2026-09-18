/**
 * @wwwuabot/ui/collection — спільні кирпичики будь-якого списку: вигляд,
 * смуга керування, чипи й правила пошуку.
 *
 * Підключення в оболонці:
 *
 *   import { CollectionToolbar, collectionViewClass } from "@wwwuabot/ui/collection";
 *
 * Кирпичик спільний: склад колекції (що саме показувати) знає екран, а те, **як**
 * її розставити, **як** її звузити й **що** при цьому стоїть на видноті — тут, і
 * однаково для нотаток, контактів, товарів, новин і постів.
 *
 * @module @wwwuabot/ui/collection
 */

export { CollectionToolbar } from "./CollectionToolbar";
export type { ToolbarChip, ToolbarPicker } from "./CollectionToolbar";
export { CollectionViewSwitch } from "./CollectionViewSwitch";
export { buildViewChips } from "./chips";
export type { ChipConfig, ChipView, CollectionChip } from "./chips";
export { DAY_BUCKETS, dayBucket, startOfDay } from "./days";
export {
  DEFAULT_TAG_FILTER,
  UNTAGGED_LABEL,
  hitTags,
  matchesTagFilter,
  queryWords,
  selectedTags,
  tagFilterLabel,
  toggleTagFilter,
  uniqueTags,
} from "./tags";
export type { CollectionTagFilter } from "./tags";
export {
  COLLECTION_OPTIONS,
  DEFAULT_COLLECTION_VIEW,
  collectionViewClass,
  collectionViewLabel,
  collectionViewShort,
  sameCollectionView,
} from "./types";
export type {
  CollectionColumns,
  CollectionLayout,
  CollectionOption,
  CollectionView,
} from "./types";
