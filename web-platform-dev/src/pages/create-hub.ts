/**
 * Хаб «Створити» — склад пунктів: що тут є і як у нього зайти.
 *
 * **Дані, а не розмітка.** Пункт малює спільний `HubList` (`@wwwuabot/ui/hub`,
 * та сама пара «склад ↔ розмітка», що у футера й меню), а цей модуль знає
 * лише те, чого не знає кирпичик: де живе кожен екран людини.
 *
 * **Дві дії — і це різні речі.** «Подивитись» веде на екран розділу (там список,
 * і він — інша сторінка). «Створити» **нікуди не веде**: воно відкриває форму
 * **поверх хабу**, а перехід на іншу сторінку робить саме «подивитись» — інша
 * кнопка. Тому в пункту `view` — адреса, а `form` — ключ поверхні, і жодного
 * `?new=1` хаб не складає: людина, яка натиснула «+», лишається в хабі, а
 * закриття форми повертає її туди ж.
 *
 * **Створення, яке в поверхню не влазить, — виняток, і він названий.** Сторінку
 * з шаблону спершу **показують** (перегляд шаблону), а потім правлять текст
 * просто на ній — це крок, якого модалка не вміє, тож у такого пункту стоїть
 * `createPath` (адреса екрана) замість `form`. Перехід тут — **push**, а не
 * `replace`: під екраном створення лишається хаб, і «назад» вертає саме до
 * нього (на відміну від «подивитись», яке хаб заміняє — воно й обирає розділ).
 *
 * **Порядок — за абеткою (А→Я).** Сталий порядок не залежить від того, хто
 * додав пункт останнім, тож місце пункту можна запам'ятати. Стежить
 * `create-hub.test.ts` — і мовою (`uk`), бо кирилиця має літери, яких
 * звичайний `sort()` не знає.
 *
 * **Чого ще немає — те названо.** Екран без створення («Дати» приходять із
 * бота) і екран без себе взагалі («Локації») мають пояснення `soon`: дія без
 * нього приглушена й чесно каже, що там буде (§7).
 *
 * @module web-platform-dev/src/pages/create-hub
 */

import type { NavigateOptions } from "react-router-dom";
import type { IconName } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import type { HubItem } from "@wwwuabot/ui/hub";
import {
  CONTACTS_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  PAGES_NEW_PATH,
  PAGES_PATH,
} from "../app/routes";
import { spaceTabPath } from "./space-tabs";

/** Сторінка дат — рядок контенту: адресу дає `slug`, а не літерал (AGENTS §7). */
const MYDATE_SLUG = "mydate";

/**
 * Яку саме форму відкриває «+» пункту.
 *
 * Ключ, а не адреса: поверхня живе **на хабі** (`CreateSheetHost`), і жодного
 * переходу за ним немає. Другий список «куди веде створення» тут був би другою
 * правдою про те саме (AGENTS.md §7).
 */
export type CreateFormKey = "note" | "ad" | "message" | "contact";

export interface CreateHubItem {
  /** Стабільний ключ — він же ключ пункту в `HubList`. */
  key: string;
  /** Підпис пункту. */
  label: string;
  /** Іконка з реєстру `@wwwuabot/shared`. */
  icon: IconName;
  /** Адреса екрана зі списком. Немає — екрана ще немає. */
  view?: string;
  /** Форма, яку «+» відкриває **поверх хабу**. Немає — створення ще немає. */
  form?: CreateFormKey;
  /**
   * Адреса **екрана створення** — коли створення не вміщується в поверхню.
   *
   * Так у «Сторінок»: шаблон обирають очима, а текст правлять на самій
   * сторінці, тож «+» мусить **перейти** — інакше кроку перегляду шаблону не
   * було б де відбутися. Разом з `form` ці два поля не стоять: у пункту одна
   * дорога до створення, і вона або поверхня, або екран.
   */
  createPath?: string;
  /**
   * Що саме буде там, де дії ще немає.
   *
   * У пункту без екрана пояснення читають обидві дії, у пункту, який уміє лише
   * показувати («Дати»), — тільки «+»: без нього приглушена кнопка мовчала б
   * про причину.
   */
  soon?: string;
}

export const CREATE_HUB_ITEMS: readonly CreateHubItem[] = [
  {
    key: "mydate",
    label: "Дати",
    icon: "my-dates",
    view: toWebPath(MYDATE_SLUG),
    // Дату заводять у боті, а тут лишається перегляд: «+», який нічого не
    // створює, мусить сказати про це сам, а не вдавати робочий.
    soon: "Додавання дати прямо із застосунку.",
  },
  {
    key: "contacts",
    label: "Контакти",
    icon: "contact",
    view: CONTACTS_PATH,
    form: "contact",
  },
  {
    key: "locations",
    label: "Локації",
    icon: "pin",
    soon: "Місця з адресами й координатами, які згадуються у сценаріях.",
  },
  { key: "notes", label: "Нотатки", icon: "text", view: NOTES_PATH, form: "note" },
  {
    key: "ads",
    label: "Оголошення",
    icon: "announce",
    // Дошки живуть у Просторі, тож адреса веде саме в її вкладку: без розділу
    // відкрилася б стрічка людей, і вкладку довелося б шукати самій людині.
    view: spaceTabPath("ads"),
    form: "ad",
  },
  {
    key: "messages",
    label: "Повідомлення",
    icon: "message-square",
    view: MESSAGES_PATH,
    form: "message",
  },
  // Сторінки — робочий пункт із **екраном** створення: «+» веде на вибір
  // шаблону (перегляд — частина вибору), а «подивитись» — у власний список,
  // де видно, що з них уже опубліковано.
  {
    key: "pages",
    label: "Сторінки",
    icon: "page",
    view: PAGES_PATH,
    createPath: PAGES_NEW_PATH,
  },
];

/** Дві дії, які має кожен пункт: подивитись або створити. */
export type HubIntent = "view" | "create";

/**
 * Склад дій — **один на всі пункти**, бо різняться вони лише тим, що роблять.
 *
 * Знак для перегляду саме `eye`: у продукті він уже означає «дивитись» (меню
 * оголошення — «Показати на дошці»), і другої назви тій самій дії не треба.
 */
export const HUB_INTENTS = [
  { key: "view", icon: "eye", verb: "Переглянути" },
  { key: "create", icon: "plus", verb: "Створити" },
] as const satisfies readonly { key: HubIntent; icon: IconName; verb: string }[];

/**
 * Чи в дії щось справді є: перегляд потребує адреси, створення — форми
 * **або** екрана (див. `createPath`).
 */
export function hubIntentReady(item: CreateHubItem, intent: HubIntent): boolean {
  return intent === "view" ? Boolean(item.view) : Boolean(item.form ?? item.createPath);
}

/** Що сказати замість дії, якої ще немає. */
export function hubIntentSoon(item: CreateHubItem, intent: HubIntent): string {
  if (item.soon) return item.soon;
  return intent === "view"
    ? `Розділ «${item.label}» ще в розробці.`
    : "Створення тут ще в розробці.";
}

/** Пункт, у якого не працює жодна дія, — він і показується приглушеним. */
export function hubItemSoon(item: CreateHubItem): boolean {
  return !item.view && !item.form && !item.createPath;
}

export interface BuildHubItemsOptions {
  /** Перехід на екран розділу — його робить **лише** дія «Переглянути». */
  navigate: (href: string, options?: NavigateOptions) => void | Promise<void>;
  /** Відкрити форму **поверх хабу** — без переходу на іншу сторінку. */
  onForm: (form: CreateFormKey) => void;
  /** Дотик до дії, якої ще немає: показати, що саме там буде. */
  onSoon: (message: string) => void;
}

export function buildHubItems({ navigate, onForm, onSoon }: BuildHubItemsOptions): HubItem[] {
  return CREATE_HUB_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    status: hubItemSoon(item) ? "soon" : "ready",
    hint: item.soon,
    actions: HUB_INTENTS.map((intent) => {
      const ready = hubIntentReady(item, intent.key);
      return {
        key: intent.key,
        icon: intent.icon,
        label: `${intent.verb}: ${item.label}`,
        soon: !ready,
        onSelect: () => {
          if (!ready) {
            onSoon(hubIntentSoon(item, intent.key));
            return;
          }
          // «Подивитись» — дія, яка змінює сторінку: хаб замінюється
          // розділом (`replace`), бо він обирає, а не приймає назад.
          if (intent.key === "view" && item.view) {
            void navigate(item.view, { replace: true });
            return;
          }
          // Створення на власному екрані — звичайний крок уперед: хаб
          // лишається під ним, і «назад» вертає в нього.
          if (item.createPath) {
            void navigate(item.createPath);
            return;
          }
          if (item.form) onForm(item.form);
        },
      };
    }),
  }));
}
