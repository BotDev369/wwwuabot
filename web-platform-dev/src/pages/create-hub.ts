/**
 * Хаб «Створити» — склад пунктів: що тут є і як у нього зайти.
 *
 * **Дані, а не розмітка.** Пункт малює спільний `HubList` (`@wwwuabot/ui/hub`,
 * та сама пара «склад ↔ розмітка», що у футера й меню), а цей модуль знає
 * лише те, чого не знає кирпичик: де живе кожен екран людини.
 *
 * **У пункту два входи, і кожен веде в СВІЙ екран.** «Подивитись» веде в
 * список, «створити» — у той самий екран, лише з наміром `?new=1`
 * (`withCreateIntent`). Другої форми тут немає навмисно: створення живе на
 * своєму екрані, і копія розійшлася б із ним першою ж правкою — та сама
 * причина, з якої контакт заводять «Контакти», а не третій список.
 *
 * **Хаб не лишається за спиною.** Обраний екран **замінює** його в історії
 * (`replace`): хаб — це вибір, а не місце, у яке вертаються. А вхід у створення
 * кладе ще й **сам розділ** під форму (`enterSection`): форму в Telegram
 * закривають «назад», і цей крок мусить вертати в розділ, а не виводити з нього.
 *
 * **Порядок — за абеткою (А→Я).** Сталий порядок не залежить від того, хто
 * додав пункт останнім, тож місце пункту можна запам'ятати. Стежить
 * `create-hub.test.ts` — і мовою (`uk`), бо кирилиця має літери, яких
 * звичайний `sort()` не знає.
 *
 * **Чого ще немає — те названо.** Екран без створення («Дати» приходять із
 * бота) і екран без себе взагалі («Локації», «Сторінки») мають пояснення
 * `soon`: дія без нього приглушена й чесно каже, що там буде (§7).
 *
 * @module web-platform-dev/src/pages/create-hub
 */

import type { NavigateOptions } from "react-router-dom";
import type { IconName } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import type { HubItem } from "@wwwuabot/ui/hub";
import {
  CONTACTS_PATH,
  CREATE_FORM_STATE,
  MESSAGES_PATH,
  NOTES_PATH,
  withCreateIntent,
  withoutCreateIntent,
} from "../app/routes";
import { spaceTabPath } from "./space-tabs";

/** Сторінка дат — рядок контенту: адресу дає `slug`, а не літерал (AGENTS §7). */
const MYDATE_SLUG = "mydate";

export interface CreateHubItem {
  /** Стабільний ключ — він же ключ пункту в `HubList`. */
  key: string;
  /** Підпис пункту. */
  label: string;
  /** Іконка з реєстру `@wwwuabot/shared`. */
  icon: IconName;
  /** Адреса екрана зі списком. Немає — екрана ще немає. */
  view?: string;
  /** Адреса екрана, який **сам** відкриє своє створення. */
  create?: string;
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
    icon: "mail",
    view: CONTACTS_PATH,
    create: CONTACTS_PATH,
  },
  {
    key: "locations",
    label: "Локації",
    icon: "globe",
    soon: "Місця з адресами й координатами, які згадуються у сценаріях.",
  },
  { key: "notes", label: "Нотатки", icon: "text", view: NOTES_PATH, create: NOTES_PATH },
  {
    key: "ads",
    label: "Оголошення",
    icon: "feed",
    // Дошки живуть у Просторі, тож адреса веде саме в її вкладку: без розділу
    // відкрилася б стрічка людей, і вкладку довелося б шукати самій людині.
    view: spaceTabPath("ads"),
    create: spaceTabPath("ads"),
  },
  {
    key: "messages",
    label: "Повідомлення",
    icon: "message-square",
    view: MESSAGES_PATH,
    create: MESSAGES_PATH,
  },
  {
    key: "pages",
    label: "Сторінки",
    icon: "layout",
    soon: "Створені сторінки: адреса, зони й що з них уже опубліковано.",
  },
];

/** Два входи, які має кожен пункт: подивитись або створити. */
export type HubIntent = "view" | "create";

/**
 * Склад дій — **один на всі пункти**, бо різняться вони лише адресою.
 *
 * Знак для перегляду саме `eye`: у продукті він уже означає «дивитись» (меню
 * оголошення — «Показати на дошці»), і другої назви тій самій дії не треба.
 */
export const HUB_INTENTS = [
  { key: "view", icon: "eye", verb: "Переглянути" },
  { key: "create", icon: "plus", verb: "Створити" },
] as const satisfies readonly { key: HubIntent; icon: IconName; verb: string }[];

/**
 * Куди веде дія. `null` — дії ще немає: тоді хаб каже, що там буде.
 *
 * «Створити» — це **та сама** адреса плюс намір: екран відкриє свою форму сам,
 * і другого правила «де створюють оголошення» не з'являється.
 */
export function hubIntentPath(item: CreateHubItem, intent: HubIntent): string | null {
  const path = intent === "view" ? item.view : item.create;
  if (!path) return null;
  return intent === "create" ? withCreateIntent(path) : path;
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
  return !item.view && !item.create;
}

export interface BuildHubItemsOptions {
  /**
   * Перехід у межах SPA (`useNavigate()`). Повертає `Promise`, бо вхід у форму —
   * це **два** кроки, і другий мусить стати після першого (див. `enterSection`).
   */
  navigate: (href: string, options?: NavigateOptions) => void | Promise<void>;
  /** Дотик до дії, якої ще немає: показати, що саме там буде. */
  onSoon: (message: string) => void;
}

/**
 * Увійти в екран — і при потребі **підкласти під форму сам розділ**.
 *
 * Хаб обирає, а не лишається: його запис замінюється обраним екраном
 * (`replace`), інакше «назад» із форми вертало б на «Створити».
 *
 * Але цього мало, коли вхід веде у **створення**: у Telegram Mini App форму
 * закривають «назад», а «назад» — це крок по історії. Тому «створити» кладе
 * **два** записи: спершу сам розділ, потім форму на ньому. Закриття форми
 * вертає в розділ, а не виводить із нього — саме цього від хабу й чекають.
 */
async function enterSection(
  navigate: BuildHubItemsOptions["navigate"],
  href: string,
): Promise<void> {
  const section = withoutCreateIntent(href);
  if (section === href) {
    await navigate(href, { replace: true });
    return;
  }

  await navigate(section, { replace: true });
  await navigate(href, { state: CREATE_FORM_STATE });
}

export function buildHubItems({ navigate, onSoon }: BuildHubItemsOptions): HubItem[] {
  return CREATE_HUB_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    status: hubItemSoon(item) ? "soon" : "ready",
    hint: item.soon,
    actions: HUB_INTENTS.map((intent) => {
      const href = hubIntentPath(item, intent.key);
      return {
        key: intent.key,
        icon: intent.icon,
        label: `${intent.verb}: ${item.label}`,
        soon: href === null,
        onSelect: () => {
          if (href) void enterSection(navigate, href);
          else onSoon(hubIntentSoon(item, intent.key));
        },
      };
    }),
  }));
}
