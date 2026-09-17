/**
 * @wwwuabot/ui/collection — вигляд колекції: рядки чи картки-превью й колонки.
 *
 * Підключення в оболонці:
 *
 *   import { CollectionViewSwitch, collectionViewClass } from "@wwwuabot/ui/collection";
 *
 * Кирпичик спільний: склад колекції (що саме показувати) знає екран, а те, **як**
 * її розставити — рядками чи плитками — тут, і однаково для нотаток, товарів,
 * новин і постів.
 *
 * @module @wwwuabot/ui/collection
 */

export { CollectionViewSwitch } from "./CollectionViewSwitch";
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
