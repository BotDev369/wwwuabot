/**
 * Вітрина — чисті функції, яких не видно з даних.
 *
 * Тут рівно те, що мусить звучати **однаково** в кожному куточку магазину:
 * підзаголовок вітрини, відбір товарів по розділу й пошуку, сума кошика
 * словами. Розійтись вони могли б непомітно — два різні «3 товари» в шапці й у
 * кошику це вже два правила одного факту (`AGENTS.md` §7). Тому тексти тут, а
 * розмітка — у компонентах; саме тому це й перевіряється без DOM.
 *
 * **Підзаголовок узятий зі сторінки, а не з налаштувань магазину.** Опис
 * магазину пише продавець у редакторі сторінки (`pages/templates.ts`: рядок
 * «Коротко про магазин» лягає блоком-заголовком третього рівня), і другий
 * спосіб сказати те саме зробив би з вітрини друге джерело правди.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import type { PageConfig, PageBlock } from "@wwwuabot/shared/types/page-config";
import type { CartTotal, ShopCard } from "@wwwuabot/shared/shop";
import type { IconName } from "@wwwuabot/shared";

/**
 * Підзаголовок вітрини — перший заголовок третього рівня на сторінці.
 *
 * Саме `h3`, а не «перший текст»: у шаблоні магазину назва — `h1`, а короткий
 * опис — `h3` (`pages/template-list.ts`). Брати перший-ліпший текст означало б
 * одного дня показати в шапці абзац «Про магазин».
 */
export function storeTagline(config: PageConfig | null): string {
  if (!config) return "";

  for (const zone of ["header", "main", "sidebar", "footer"] as const) {
    const found = findBlock(config.zones?.[zone] ?? [], (block) => {
      if (block.type !== "text") return false;
      const level = (block.props as { level?: unknown }).level;
      return level === "h3" && typeof (block.props as { title?: unknown }).title === "string";
    });
    if (found) return String((found.props as { title?: string }).title ?? "").trim();
  }
  return "";
}

/**
 * Розділ вітрини: текст продавця, показаний як **окремий розділ зі своєю
 * шапкою**, а не як абзац у спільному стосі.
 */
export interface StoreSection {
  /** Ключ списку — беремо з блока, щоб розділ не перемонтовувався на правці. */
  id: string;
  /** Назва розділу; порожній — текст без власної шапки. */
  title: string;
  /** Знак шапки: підказаний назвою, а не вибраний продавцем. */
  icon: IconName;
  /** Блоки тіла розділу — те, що рендерить `ZoneRenderer`. */
  blocks: PageBlock[];
}

/**
 * Знак розділу за його назвою.
 *
 * У блоці сторінки знака немає (продавець пише тільки заголовок), а без знака
 * шапка розділу — смуга з самим словом. Ключове слово в назві дає розділові
 * обличчя: «Доставка» і «Замовлення» перестають виглядати однаково. Невідома
 * назва отримує нейтральний знак — це **не** помилка, бо назву пише продавець,
 * і вимагати від неї нашого словника не можна.
 */
export function sectionIcon(title: string): IconName {
  const needle = title.toLowerCase();
  const rules: readonly [RegExp, IconName][] = [
    [/достав|відправ|пошт|самовив|кур'?єр/u, "pin"],
    [/оплат|платіж|грош|рахунок|карт/u, "card"],
    [/замов|контакт|телефон|адрес|графік|зв'?яз/u, "contact"],
    [/гарант|поверн|якіст|обмін/u, "check"],
    [/знижк|акці|бонус|розпродаж/u, "percent"],
    [/питанн|часті|faq/u, "question"],
    [/магазин|про нас|істор|команд/u, "shop"],
  ];
  return rules.find(([pattern]) => pattern.test(needle))?.[1] ?? "info";
}

/**
 * Текст продавця → розділи вітрини.
 *
 * Розділом стає картка: саме її в редакторі сторінки заводить продавець під
 * кожен текст («Про магазин», «Доставка й оплата»), і саме вона має назву.
 * Тому шапку розділу малює вітрина, а **не** картка: у картці заголовок, тло й
 * рамка — це три різні правила одного блока, і в шапці вони давали заголовок
 * посеред білого прямокутника замість шапки зверху.
 *
 * Решта блоків не губиться:
 *
 *   - **не картка** (напр. просто текст) шапки не отримує і лягає тілом у
 *     попередній розділ — заголовок і тіло такий блок малює сам, і власна
 *     шапка поставила б назву двічі;
 *   - **розділювач** пропускаємо: він малював межу між картками в спільному
 *     стосі, а тепер картки стоять окремо і межа між ними — власна рамка.
 */
export function storeSections(blocks: readonly PageBlock[]): StoreSection[] {
  const sections: StoreSection[] = [];

  for (const [index, block] of blocks.entries()) {
    if (block.type === "divider") continue;

    const previous = sections[sections.length - 1];

    if (block.type !== "card") {
      if (previous) previous.blocks.push(block);
      else sections.push(anonymous(block.id ?? `section-${index}`, [block]));
      continue;
    }

    const props = (block.props ?? {}) as { title?: unknown };
    const title = typeof props.title === "string" ? props.title.trim() : "";
    // Картку розбираємо, бо її малює **розділ**: `CardBlock` ставить тло,
    // рамку й відступ **інлайном**, і в шапці це дало б прямокутник у
    // прямокутнику. Заголовок картки при цьому не губиться — він стає назвою
    // розділу.
    sections.push({
      id: block.id ?? `section-${index}`,
      title,
      icon: sectionIcon(title),
      blocks: [...(block.children ?? [])],
    });
  }

  return sections;
}

/** Розділ без шапки: тексту продавця не дали назви, і вигадувати її не можна. */
function anonymous(id: string, blocks: PageBlock[]): StoreSection {
  return { id, title: "", icon: "info", blocks };
}

/** Блок за умовою, разом із вкладеними (картка тримає текст у собі). */
function findBlock(blocks: PageBlock[], match: (block: PageBlock) => boolean): PageBlock | null {
  for (const block of blocks) {
    if (match(block)) return block;
    const nested = findBlock(block.children ?? [], match);
    if (nested) return nested;
  }
  return null;
}

/**
 * Що робити з товарами залежно від обраного розділу й пошуку.
 *
 * Порожній розділ (`null`) — «усі»: це стан вітрини за замовчуванням, бо
 * покупцеві, який щойно відкрив магазин, потрібен весь каталог.
 *
 * Пошук дивиться в **назву, опис і розділ** — саме те, що покупець пам'ятає про
 * товар. Цін він не чіпає: шукати за ціною означало б обіцяти відбір за ціною,
 * якої в магазині може не бути числом.
 */
export function filterCards(
  cards: readonly ShopCard[],
  catalog: string | null,
  query: string,
): ShopCard[] {
  const needle = query.trim().toLowerCase();
  return cards.filter((card) => {
    if (catalog !== null && card.category !== catalog) return false;
    if (!needle) return true;
    return `${card.title} ${card.summary} ${card.category}`.toLowerCase().includes(needle);
  });
}

/**
 * Число з українським словом у правильній формі: 1 товар, 2 товари, 5 товарів.
 *
 * Слово приходить трьома формами, бо «3 товари» й «3 товарів» — це не стиль, а
 * помилка; а брати готову бібліотеку заради трьох слів означало б тягнути
 * словник на всю вітрину.
 */
export function plural(count: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (tail === 1) return forms[0];
  if (tail >= 2 && tail <= 4) return forms[1];
  return forms[2];
}

/** «8 товарів» — довідка шапки каталогу: покупець бачить обсяг полиці. */
export function goodsLabel(count: number): string {
  return `${count} ${plural(count, ["товар", "товари", "товарів"])}`;
}

/** «Товарів: 12 · Розділів: 3» — довідка шапки, а не речення. */
export function storeStatsLabel(products: number, catalogs: number): string {
  const groups = `${catalogs} ${plural(catalogs, ["розділ", "розділи", "розділів"])}`;
  return `${goodsLabel(products)} · ${groups}`;
}

/** Сума з розділювачами: «1 250 ₴». Гривня — грошова одиниця магазину. */
export function amountLabel(amount: number): string {
  return `${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/gu, "\u00a0")} ₴`;
}

/**
 * Разом по кошику одним рядком.
 *
 * **«Разом» тут — довідка, а не ціна замовлення:** ціну називає продавець, і
 * замовлення не має суми взагалі (`docs/SHOPS.md` §6). Тому коли відомих цін
 * немає, рядок каже «Ціну узгодить продавець», а не «0 ₴»; коли частина цін
 * договірна, сума стоїть **із поміткою**, що вона неповна.
 */
export function cartTotalLabel(total: CartTotal): string {
  if (total.amount === null) return "Ціну узгодить продавець";
  const base = amountLabel(total.amount);
  return total.hasUnknown ? `${base} + договірні позиції` : base;
}

/** Скільки одиниць у кошику — число на кнопці. */
export function cartCountLabel(count: number): string {
  return count > 0 ? `Кошик · ${count}` : "Кошик";
}

/** Скільки товарів показано: «Знайдено: 4» замість порожнього місця. */
export function foundLabel(shown: number): string {
  return `Показано: ${shown} ${plural(shown, ["товар", "товари", "товарів"])}`;
}
