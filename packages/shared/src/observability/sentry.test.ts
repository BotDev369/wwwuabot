/**
 * Тести налаштувань Sentry.
 *
 * Найдорожчі тут дві речі: (1) без DSN воркер мусить працювати як звичайно і
 * (2) у Sentry не має потрапити ніщо, чим можна видати себе за користувача
 * (`initData` у заголовках, cookie `admin_session`). Другий пункт — не
 * «бажано», а вимога: `initData` дає доступ до акаунта, поки не спливе.
 */

import { describe, expect, it } from "vitest";
import { scrubSentryEvent, sentryOptions, type SentryEventLike } from "./sentry";

describe("sentryOptions", () => {
  it("без DSN вимикає Sentry (воркер працює як звичайно)", () => {
    expect(sentryOptions({})).toBeUndefined();
    expect(sentryOptions({ SENTRY_DSN: "" })).toBeUndefined();
    expect(sentryOptions({ SENTRY_DSN: "   " })).toBeUndefined();
  });

  it("з DSN віддає dsn, environment і release", () => {
    const options = sentryOptions({
      SENTRY_DSN: "https://key@o1.ingest.sentry.io/2",
      ENVIRONMENT: "production",
      CF_VERSION_METADATA: { id: "v42" },
    });

    expect(options?.dsn).toBe("https://key@o1.ingest.sentry.io/2");
    expect(options?.environment).toBe("production");
    expect(options?.release).toBe("v42");
  });

  it("без ENVIRONMENT підставляє `dev`, а не `production`", () => {
    // SDK за замовчуванням узяв би `"production"` — і всі події з дев-воркерів
    // виглядали б як продові. Свідомо перекриваємо це.
    const options = sentryOptions({ SENTRY_DSN: "https://key@o1.ingest.sentry.io/2" });

    expect(options?.environment).toBe("dev");
  });

  it("зберігає нетипове значення, щоб одруківка була видна в Sentry", () => {
    const options = sentryOptions({
      SENTRY_DSN: "https://key@o1.ingest.sentry.io/2",
      ENVIRONMENT: "prod",
    });

    expect(options?.environment).toBe("prod");
  });

  it("не вмикає перформанс — квота лишається під помилки", () => {
    expect(
      sentryOptions({ SENTRY_DSN: "https://key@o1.ingest.sentry.io/2" })?.tracesSampleRate,
    ).toBe(0);
  });

  it("вимикає збір даних користувача", () => {
    const dataCollection = sentryOptions({
      SENTRY_DSN: "https://key@o1.ingest.sentry.io/2",
    })?.dataCollection;

    expect(dataCollection?.userInfo).toBe(false);
    expect(dataCollection?.cookies).toBe(false);
    expect(dataCollection?.httpHeaders).toEqual({ request: false, response: false });
    expect(dataCollection?.httpBodies).toEqual([]);
    expect(dataCollection?.urlQueryParams).toBe(false);
  });
});

describe("scrubSentryEvent", () => {
  it("прибирає заголовки, cookie, тіло й query-параметри", () => {
    const event: SentryEventLike = {
      request: {
        url: "https://api-dev.example.com/api/my-dates?ids=1,2",
        headers: { "X-Telegram-Init-Data": "user=%7B%22id%22%3A1%7D&hash=secret" },
        cookies: { admin_session: "signed.token" },
        data: { name: "Олег", notes: "особисте" },
        query_string: "ids=1,2",
      },
    };

    expect(scrubSentryEvent(event).request).toEqual({
      url: "https://api-dev.example.com/api/my-dates",
    });
  });

  it("не ламає подію, у якої немає запиту", () => {
    expect(scrubSentryEvent({})).toEqual({});
    expect(scrubSentryEvent({ request: {} })).toEqual({ request: { url: undefined } });
  });
});
