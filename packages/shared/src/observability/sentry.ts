/**
 * Спільні налаштування Sentry для воркерів (`api-dev`, `bot-dev`).
 *
 * Модуль НАВМИСНО не імпортує `@sentry/cloudflare` у рантаймі — він повертає
 * звичайний обʼєкт, який воркер віддає в `Sentry.withSentry`. Відповідність
 * реальному типу SDK перевіряється на місці виклику через `satisfies`. Так
 * `packages/shared` лишається без залежностей і не тягне серверний SDK у
 * браузерні бандли.
 *
 * Середовище: `environment` береться з `ENVIRONMENT` воркера. Якщо його не
 * задано — підставляється `dev`, а не `production` (як робить SDK за
 * замовчуванням): інакше події з дев-воркерів змішуються з продовими.
 * Деталі — `@wwwuabot/shared/config/environment`.
 *
 * Політика даних: у Sentry не йде нічого, що може ідентифікувати користувача
 * або дати доступ до акаунта — ані `initData` (підпис дозволяє видавати себе
 * за користувача, поки не спливе), ані cookie `admin_session`, ані тіла
 * запитів, ані query-параметрів. Тому `dataCollection` вимкнено явно, а
 * `beforeSend` — друга, вже безумовна лінія захисту.
 *
 * @module packages/shared/src/observability/sentry
 */

import { ENV_DEV } from "../config/environment";

/** Те, що воркер має з оточення Cloudflare. */
export interface SentryEnv {
  /** DSN із Sentry. Немає або порожній → Sentry вимкнено, воркер працює як звичайно. */
  SENTRY_DSN?: string;
  /** Середовище для подій — `dev` або `production` (див. `config/environment`). */
  ENVIRONMENT?: string;
  /** Binding Cloudflare `CF_VERSION_METADATA` — дає `id` релізу. */
  CF_VERSION_METADATA?: { id?: string };
}

/**
 * Мінімальна спільна риса події Sentry.
 *
 * Свідомо лише `request` — решту полів події чіпати не потрібно, а їхнє
 * дублювання тут означало б копіювати внутрішній тип SDK.
 */
export interface SentryEventLike {
  request?: unknown;
}

/**
 * Прибирає з події все, що може містити чужі дані.
 *
 * Лишає тільки шлях запиту без query — щоб було видно, який ендпоїнт
 * зламався, і при цьому не зберігати ні заголовків (там `initData` і
 * cookie сесії), ні тіла, ні `?ids=...`.
 *
 * Generic навмисний: повертає той самий тип події, який отримав, інакше
 * функція не була б сумісна з `beforeSend` із SDK.
 */
export function scrubSentryEvent<T extends SentryEventLike>(event: T): T {
  const request = event.request;
  if (!request || typeof request !== "object") return event;
  const { url } = request as { url?: unknown };
  return {
    ...event,
    request: { url: typeof url === "string" ? url.split("?")[0] : undefined },
  } as T;
}

/** Форма опцій, яку очікує `Sentry.withSentry`. */
export interface SentryOptionsLike {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate: number;
  dataCollection: {
    userInfo: boolean;
    cookies: boolean;
    httpHeaders: { request: boolean; response: boolean };
    httpBodies: [];
    urlQueryParams: boolean;
  };
  beforeSend: typeof scrubSentryEvent;
}

/**
 * Опції Sentry або `undefined`, якщо DSN не заданий.
 *
 * `withSentry` трактує `undefined` як «SDK не потрібен» — тому секрет можна
 * додати пізніше, без окремого деплою й без ризику зламати прод.
 */
export function sentryOptions(env: SentryEnv): SentryOptionsLike | undefined {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return undefined;

  return {
    dsn,
    // Значення передається як є (щоб одруківка була видна в Sentry окремим
    // середовищем, а не злилась непомітно), але за відсутності — `dev`.
    // SDK узяв би `"production"` за замовчуванням, і дев-події виглядали б
    // як продові.
    environment: env.ENVIRONMENT?.trim() || ENV_DEV,
    release: env.CF_VERSION_METADATA?.id,
    // 0 = перформанс вимкнено. Безкоштовний план — 5 000 помилок/місяць,
    // тож трейси лише зʼїдали б квоту, не даючи користі на цьому етапі.
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
    },
    beforeSend: scrubSentryEvent,
  };
}
