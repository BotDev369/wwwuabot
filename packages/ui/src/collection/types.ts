/**
 * Вигляд колекції — рядки чи картки-превью, і скількома колонками.
 *
 * Це **спільний кирпичик**, а не частина нотаток: той самий вибір («рядок» проти
 * «плитки», як у товарів, новин чи постів) знадобиться кожному списку, і тоді
 * розкладка мусить бути вже описана, а не написана вдруге. Тому тут немає ні
 * React, ні слова «нотатка» — тільки модель, варіанти для пікера й клас
 * розкладки, тобто чисті функції, які можна перевірити без DOM.
 *
 * Ключове: «рядок» і «картка» — це **одна розмітка з різною розкладкою**
 * (`collectionViewClass`), а не два набори розмітки. Картка показує рівно те
 * саме, що рядок, лише розставлене інакше; другий набір розійшовся б із першим
 * на першій же правці (правило 3).
 *
 * @module @wwwuabot/ui/collection
 */

import type { IconName } from "@wwwuabot/shared";

/** Як розставлено елементи: рядками в один стовпчик чи плитками. */
export type CollectionLayout = "rows" | "cards";

/** Скільки плиток стоїть в одному ряду на екрані. */
export type CollectionColumns = 1 | 2;

export interface CollectionView {
  layout: CollectionLayout;
  columns: CollectionColumns;
}

/**
 * Типове — **рядки**: список читають заради тексту, і рядок віддає йому всю
 * ширину. Плитки — вибір людини, а не стан за замовчуванням.
 */
export const DEFAULT_COLLECTION_VIEW: CollectionView = { layout: "rows", columns: 2 };

/** Варіант вигляду — це **дані** для пікера, а не розмітка. */
export interface CollectionOption {
  /** Стабільний ключ React-списку. */
  key: string;
  /** Підпис у списку вибору. */
  label: string;
  /**
   * Знак варіанта. Три різні, бо дії різні: рядки, одна плитка, дві плитки —
   * один і той самий знак не сказав би, чим варіанти відрізняються.
   */
  icon: IconName;
  view: CollectionView;
}

/**
 * Варіанти вибору — **три рядки, а не два + друга поверхня**: колонки мають
 * сенс лише для плиток, і окремий вибір «скільки колонок» показувався б у
 * режимі рядків, де він нічого не міняє. Один пікер — один дотик.
 */
export const COLLECTION_OPTIONS: readonly CollectionOption[] = [
  { key: "rows", label: "Рядки", icon: "list", view: { layout: "rows", columns: 2 } },
  {
    key: "cards-1",
    label: "Картки — 1 колонка",
    icon: "card",
    view: { layout: "cards", columns: 1 },
  },
  {
    key: "cards-2",
    label: "Картки — 2 колонки",
    icon: "grid",
    view: { layout: "cards", columns: 2 },
  },
];

/**
 * Чи це той самий вигляд. У рядків колонок немає — інакше «рядки з двома
 * колонками» і «рядки з однією» були б двома різними станами, які виглядають
 * однаково, і пікер показував би галочку двічі.
 */
export function sameCollectionView(a: CollectionView, b: CollectionView): boolean {
  if (a.layout !== b.layout) return false;
  return a.layout === "rows" || a.columns === b.columns;
}

/** Підпис вигляду: у клітинці лише знак, тож поточний вибір читає `aria-label`. */
export function collectionViewLabel(view: CollectionView): string {
  if (view.layout === "rows") return "Рядки";
  return view.columns === 1 ? "Картки — 1 колонка" : "Картки — 2 колонки";
}

/** Короткий підпис для чипа: туди повний («Картки — 2 колонки») не влазить. */
export function collectionViewShort(view: CollectionView): string {
  if (view.layout === "rows") return "Рядки";
  return `Картки · ${view.columns}`;
}

/**
 * Клас розкладки для списку — кирпичик `.wb-collection*`.
 *
 * Розкладку тримає **саме цей клас**, а не список: два `display` на одному
 * елементі билися б, і перемагав би той, що нижче у файлі.
 */
export function collectionViewClass(view: CollectionView): string {
  if (view.layout === "rows") return "wb-collection wb-collection--rows";
  return `wb-collection wb-collection--cards wb-collection--cols-${view.columns}`;
}
