/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TELEGRAM CHROME — нативна шапка й низ клієнта в кольорах нашої теми
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Проблема: наш хром (`.wb-app-header`, `.wb-tabbar`) фарбується токенами
 * `--bg-1` зі стилю продукту, а нативна шапка Telegram над Mini App і смуга
 * під ним — темою самого клієнта. Два різні кольори на одному екрані —
 * той шов, що «ріже око» (AGENTS.md §3, «Єдиний дизайн»).
 *
 * Рішення: кольори нативного хрома — теж токени. Стиль продукту задає
 * `--chrome-header-bg` / `--chrome-bottom-bg` (плоскі hex, бо Telegram
 * приймає лише їх), а цей модуль читає їх і віддає клієнту через
 * `setHeaderColor` / `setBackgroundColor` / `setBottomBarColor`.
 *
 * Що синхронізує:
 *   шапка клієнта          ← `--chrome-header-bg`
 *   фон Mini App           ← `--chrome-header-bg` (щоб не мигало іншим кольором
 *                             під час скролу за межі viewport)
 *   смуга під Mini App     ← `--chrome-bottom-bg` (те саме місце, що й футер)
 *
 * **Шапку клієнта залишаємо — і фарбуємо її.** Рядок, який Telegram малює
 * над Mini App (ім'я бота, «←», «розгорнути», «меню»), застосунку не
 * підкоряється: з нього керується лише колір. Повноекранний режим (Bot API
 * 8.0+) **не просимо**: у ньому шапка прозора й імені бота немає зовсім — а
 * еталон (Tribute) тримає саме рідну шапку, пофарбовану в колір обкладинки.
 * Тому на головній шапка бере колір верхньої смуги графіки
 * (`--chrome-hero-header-bg`, атрибут `data-chrome="hero"`), на решті екранів
 * — колір теми.
 *
 * Коли: старт застосунку (разом з `initTheme()`), кожна зміна `data-theme`
 * (MutationObserver) і подія клієнта `themeChanged` (користувач повернув тему
 * Telegram у налаштуваннях).
 *
 * Поза Telegram (звичайний браузер, тести) модуль — no-op: без `window`
 * і без `window.Telegram.WebApp` він нічого не робить і нічого не ламає.
 *
 * @module packages/shared/src/app/telegram-chrome
 */

import type { TelegramChromeColor, TelegramWebApp } from "../types/telegram";
import { afterDelay, publishAppbarColor, readChromeColors, readClientHeader } from "./chrome-color";

// Кольорова частина (що каже клієнт, що просимо ми) — окремий модуль: тут
// лишаються події, вставки й синхронізація, там — саме кольори.
export {
  chromeInk,
  normalizeChromeColor,
  publishAppbarColor,
  readAppbarColor,
  readChromeColor,
  readChromeColors,
  readClientHeader,
} from "./chrome-color";
export type { ChromeColors, ClientHeader, ClientHeaderSource } from "./chrome-color";

/** Подія клієнта, яку Telegram шле при зміні теми в налаштуваннях. */
const THEME_CHANGED_EVENT = "themeChanged";

/**
 * DOM-атрибут, за яким ми стежимо: його ставлять `initTheme()` / `useStyleTheme()`
 * при кожному виборі теми. Кожна тема несе власні `--chrome-*`, тож саме зміна
 * цього атрибута і є моментом, коли хром клієнта мусить перефарбуватись.
 */
const OBSERVED_ATTRS = ["data-theme", "data-chrome", "data-tone"] as const;

/**
 * Шле клієнту три методи кольору. Окрема чиста функція — щоб тести могли
 * підсунути фейковий WebApp і перевірити сам набір викликів, без DOM.
 *
 * Кожен виклик у власному `try`: Telegram на старих версіях кидає виняток на
 * незнайомий метод, і падіння одного не повинно зривати решту.
 */
export function applyChromeColors(
  webApp: Pick<TelegramWebApp, "setHeaderColor" | "setBackgroundColor" | "setBottomBarColor">,
  header: TelegramChromeColor,
  bottom: TelegramChromeColor,
  background: TelegramChromeColor = header,
): void {
  try {
    webApp.setHeaderColor?.(header);
  } catch {
    /* клієнт не знає методу — лишаємо його колір */
  }
  try {
    webApp.setBackgroundColor?.(background);
  } catch {
    /* те саме */
  }
  try {
    webApp.setBottomBarColor?.(bottom);
  } catch {
    /* те саме */
  }
}

/**
 * Смуга керування клієнта в повноекранному режимі — «закрити» й «меню» над
 * застосунком.
 *
 * Це **підлога**, а не мірка: частина клієнтів доносить інсет як `0` і при
 * цьому малює свої кнопки просто по застосунку — тоді наш хедер стояв би під
 * ними (саме так і виглядало). Коли клієнт інсет таки віддає, береться він.
 */
const FULLSCREEN_CONTROLS_H = 48;

/**
 * Те саме місце на Android — більше за підлогу вище, бо цей клієнт малює
 * свою смугу не замість системної панелі, а **під нею**, і водночас віддає
 * обидва інсети як `0` (bugs.telegram.org/c/66082): місце під панель і кнопки
 * доводиться резервувати самим — 24 системна панель, 40 смуга, 8 просвіт.
 */
const ANDROID_FULLSCREEN_H = 72;

/** Підлога повного екрана для цієї платформи; клієнт прислав більше — буде більше. */
function fullscreenFloor(platform: string | undefined): number {
  return platform === "android" ? ANDROID_FULLSCREEN_H : FULLSCREEN_CONTROLS_H;
}

/**
 * Одне поле інсету як число: не-число, `NaN` і від'ємне — `0`. Клієнт шле
 * «нічого» як `0`, тож нуль мусить бути дійсним значенням.
 */
export function readInset(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** Верхнє й нижнє місце, яке UI клієнта займає над і під застосунком. */
export interface ClientInsets {
  top: number;
  bottom: number;
}

/**
 * Складає вставки з двох джерел клієнта (`safeAreaInset` — система,
 * `contentSafeAreaInset` — UI Telegram) в одне число на край.
 *
 * `max`, а не сума: джерела описують той самий простір згори й знизу, а сума
 * на клієнті, який уже віддав усе в `contentSafeAreaInset`, дала б подвійний
 * відступ. У повноекранному режимі вмикається підлога смуги керування.
 */
export function clientInsets(
  webApp: Pick<
    TelegramWebApp,
    "safeAreaInset" | "contentSafeAreaInset" | "isFullscreen" | "platform"
  >,
): ClientInsets {
  const top = Math.max(
    readInset(webApp.safeAreaInset?.top),
    readInset(webApp.contentSafeAreaInset?.top),
  );
  const bottom = Math.max(
    readInset(webApp.safeAreaInset?.bottom),
    readInset(webApp.contentSafeAreaInset?.bottom),
  );
  if (webApp.isFullscreen !== true) return { top, bottom };
  return { top: Math.max(top, fullscreenFloor(webApp.platform)), bottom };
}

/**
 * Публікує вставки у власних змінних на `<html>` — їх читають `--safe-top` і
 * `--safe-bottom` (`styles/tokens.css`). Саме тут, а не лише в CSS: значення
 * клієнта — числа з його API, і підлога повного екрана існує тільки в JS.
 *
 * Без `document` (SSR, юніт-тест) — no-op.
 */
export function applyClientInsets(
  webApp: Pick<
    TelegramWebApp,
    "safeAreaInset" | "contentSafeAreaInset" | "isFullscreen" | "platform"
  >,
  root?: HTMLElement,
): void {
  const el = root ?? (typeof document === "undefined" ? undefined : document.documentElement);
  if (!el) return;
  const { top, bottom } = clientInsets(webApp);
  el.style.setProperty("--client-inset-top", `${top}px`);
  el.style.setProperty("--client-inset-bottom", `${bottom}px`);
}

/** Чи WebApp схожий на справжній: має хоча б один метод кольору. */
export function isTelegramWebApp(value: unknown): value is TelegramWebApp {
  if (typeof value !== "object" || value === null) return false;
  const app = value as Partial<TelegramWebApp>;
  return (
    typeof app.setHeaderColor === "function" ||
    typeof app.setBackgroundColor === "function" ||
    typeof app.setBottomBarColor === "function"
  );
}

/** Події, після яких вставки перечитуються (Bot API 8.0+). */
const INSET_EVENTS = [
  "safeAreaChanged",
  "contentSafeAreaChanged",
  "fullscreenChanged",
  "viewportChanged",
] as const;

/**
 * Реєструє зміну теми: один синхронізаційний прохід + спостерігач.
 *
 * Повертає функцію відписки (для тестів і hot-reload); у застосунку вона
 * не викликається — модуль живе стільки, скільки сторінка.
 *
 * Немає WebApp, немає `document` або немає `MutationObserver` — no-op,
 * який повертає `() => undefined`.
 */
/** Живий прохід — один на сторінку: новий ініціал знімає попередній. */
let activeCleanup: (() => void) | undefined;

export function initTelegramChrome(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => undefined;

  const webApp = window.Telegram?.WebApp;
  if (!isTelegramWebApp(webApp)) return () => undefined;

  activeCleanup?.();

  // Що ми вже просили в клієнта — щоб не смикати його тим самим кольором
  // на кожну подію (і не ганяти колір туди-сюди після підтвердження).
  let asked: string | null = null;
  // Покоління проходу: перевірка, запущена раніше, не має права перефарбувати
  // те, що вже вирішив новіший прохід (інакше стара «не прийняв» гасить тон).
  let generation = 0;
  // Відписка: жодна вже запланована перевірка не сміє фарбувати далі.
  let disposed = false;

  /**
   * 1. Смуга = колір, який **клієнт назвав своїм** (безпечно завжди).
   * 2. Просимо тон розділу й **читаємо назад**: підтвердив — смуга й графіка
   *    беруть тон, ні — повертаємо клієнту його власний колір.
   */
  const sync = () => {
    if (disposed) return;
    const myGeneration = ++generation;
    const colors = readChromeColors();
    if (!colors) return;

    const client = readClientHeader(webApp);
    if (!client || client.source === "theme") {
      // Поза Telegram або клієнт без `themeParams`: показуємо свій тон.
      applyChromeColors(webApp, colors.header, colors.bottom, colors.background);
      publishAppbarColor(colors.header);
      return;
    }

    // 1. Факт від клієнта — понад усе.
    publishAppbarColor(client.color);

    // Вже той самий колір (або прийшов у відповідь `themeChanged`) — просити нічого.
    if (client.color === colors.header) {
      applyChromeColors(webApp, colors.header, colors.bottom, colors.background);
      return;
    }

    const key = `${colors.header}|${client.color}`;
    if (asked === key) return;
    asked = key;
    applyChromeColors(webApp, colors.header, colors.bottom, colors.background);

    // Клієнти відповідають по-різному швидко: перевіряємо двічі, перш ніж
    // вирішити, що він наш колір не взяв. Застарілий прохід мовчить.
    const verify = (attempt: number): void => {
      afterDelay(
        () => {
          if (disposed || myGeneration !== generation) return;
          const echo = readClientHeader(webApp);
          // Клієнт віддав назад наш колір — тон розділу підтверджено.
          if (echo && echo.color === colors.header) {
            publishAppbarColor(colors.header);
            return;
          }
          if (attempt < 1) {
            verify(attempt + 1);
            return;
          }
          // Не підтвердив: повертаємо клієнту його власний колір — і смуга, і
          // шапка лишаються однією поверхнею, хай тон і не застосувався.
          if (readClientHeader(webApp)?.color !== client.color) {
            try {
              webApp.setHeaderColor?.(client.color);
            } catch {
              /* клієнт не знає методу — його власний колір і так лишився */
            }
          }
          publishAppbarColor(client.color);
        },
        attempt === 0 ? 80 : 260,
      );
    };
    verify(0);
  };

  sync();
  // `ready` — до вставок, а не після: клієнт заповнює `safeAreaInset` /
  // `contentSafeAreaInset` тоді, коли показує Mini App, тож прочитане до
  // `ready` приходить нулями — а події про таке «заповнення» не гарантовані
  // (саме через це хедер стояв під кнопками клієнта).
  webApp.ready?.();
  applyClientInsets(webApp);

  // Один кадр по тому — ще раз: у dev CSS доливається модулем (може встигнути
  // пізніше за перший sync), а частина клієнтів застосовує колір лише після ready.
  // Вставки перечитуємо тим самим кадром: перехід у повний екран зсуває їх, і
  // значення з першого проходу — ще дорожні.
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      sync();
      applyClientInsets(webApp);
    });
  }

  const observer = typeof MutationObserver === "function" ? new MutationObserver(sync) : undefined;
  observer?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [...OBSERVED_ATTRS],
  });

  // Користувач повернув тему Telegram у налаштуваннях — перечитуємо токени
  // (CSS не зміниться, але в момент події клієнт скидає свій хром).
  const onThemeChanged = () => sync();

  // Вставки клієнт міняє живою: вхід у повний екран, розкрита/згорнута його
  // смуга, поворот екрана. Перехід у повний екран приходить саме подією, тож
  // без цих підписок підлога смуги керування не встигла б до першого рендера.
  const onInsetChanged = () => applyClientInsets(webApp);

  for (const [event, handler] of [
    [THEME_CHANGED_EVENT, onThemeChanged],
    ...INSET_EVENTS.map((event) => [event, onInsetChanged] as const),
  ] as const) {
    try {
      webApp.onEvent?.(event, handler);
    } catch {
      /* подій немає в цього клієнта — ок */
    }
  }

  const cleanup = () => {
    disposed = true;
    generation += 1;
    if (activeCleanup === cleanup) activeCleanup = undefined;
    observer?.disconnect();
    for (const [event, handler] of [
      [THEME_CHANGED_EVENT, onThemeChanged],
      ...INSET_EVENTS.map((event) => [event, onInsetChanged] as const),
    ] as const) {
      try {
        webApp.offEvent?.(event, handler);
      } catch {
        /* ignore */
      }
    }
  };

  activeCleanup = cleanup;
  return cleanup;
}
