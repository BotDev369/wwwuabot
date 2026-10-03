/**
 * Заголовки безпеки — те, що не видно на екрані: регресія тут не падає,
 * сторінка лишається «працюючою», поки не приходить звіт про інжекцію.
 * Дивний CORS перевіряється окремо: `*` був тут і повертається легко.
 *
 * @module packages/shared/src/security/headers.test
 */

import { describe, expect, it } from "vitest";
import { applySameOriginCors, applySecurityHeaders, secureResponse } from "./headers";

const PROD = "https://app.wwwuabot.com/space";
const LOCAL = "http://localhost:5173/space";

function ok(): Response {
  return new Response("body", { status: 200, headers: { "Content-Type": "text/html" } });
}

function header(res: Response, name: string): string | null {
  return res.headers.get(name);
}

describe("захисні заголовки", () => {
  it("ставить базові заголовки на будь-яку відповідь", () => {
    const res = applySecurityHeaders(ok());
    expect(header(res, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(res, "X-Frame-Options")).toBe("DENY");
    expect(header(res, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header(res, "Permissions-Policy")).toContain("geolocation=()");
  });

  it("не змінюють статус і тіло", async () => {
    const res = applySecurityHeaders(new Response("складне тіло", { status: 418 }));
    expect(res.status).toBe(418);
    expect(await res.text()).toBe("складне тіло");
  });

  it("⛔ CSP забороняє вбудування в чужу сторінку та вбудовані об'єкти", () => {
    const csp = header(
      applySecurityHeaders(ok(), { csp: true, url: PROD }),
      "Content-Security-Policy",
    );
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it("CSP лишає Telegram SDK, інлайнові стилі блоків і зовнішні фото", () => {
    const csp = header(
      applySecurityHeaders(ok(), { csp: true, url: PROD }),
      "Content-Security-Policy",
    );
    // Без цього інлайнові стилі блоків зникли б, а `window.Telegram.WebApp` не існував би.
    expect(csp).toContain("script-src 'self' https://telegram.org");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data: blob: https:");
  });

  it("⛔ на локалці CSP послаблюється: інакше Vite HMR не працює", () => {
    const local = header(
      applySecurityHeaders(ok(), { csp: true, url: LOCAL }),
      "Content-Security-Policy",
    );
    const prod = header(
      applySecurityHeaders(ok(), { csp: true, url: PROD }),
      "Content-Security-Policy",
    );
    expect(local).toContain("'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
  });

  it("⛔ без URL ставиться строгий CSP, а не послаблений: незнання — не привід послабити", () => {
    // Викликач без `url` не сказав, що це локалка, тож береться продакшн-політика.
    const csp = header(applySecurityHeaders(ok(), { csp: true }), "Content-Security-Policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("HSTS лише на HTTPS: на localhost він зробив би сервер недоступним", () => {
    expect(
      header(applySecurityHeaders(ok(), { url: PROD }), "Strict-Transport-Security"),
    ).toContain("max-age=31536000");
    expect(
      header(applySecurityHeaders(ok(), { url: LOCAL }), "Strict-Transport-Security"),
    ).toBeNull();
  });

  it("HSTS можна вимкнути явно — тестовий домен не має бути «закованим»", () => {
    expect(
      header(applySecurityHeaders(ok(), { url: PROD, hsts: false }), "Strict-Transport-Security"),
    ).toBeNull();
  });
});

describe("CORS замість зірочки", () => {
  it("дозволяє лише те джерело, з якого прийшов запит", () => {
    const res = applySameOriginCors(ok(), PROD);
    expect(header(res, "Access-Control-Allow-Origin")).toBe("https://app.wwwuabot.com");
    expect(header(res, "Vary")).toBe("Origin");
  });

  it("⛔ не повертає '*' навіть коли джерело інше", () => {
    // Старий стан: `*` стояв на HTML адмінки, тож будь-який сайт міг
    // прочитати її відповідь. Регресія сюди повертається легко.
    expect(header(applySameOriginCors(ok(), PROD), "Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("⛔ без URL (service binding, cron) заголовок CORS не ставиться взагалі", () => {
    const res = applySameOriginCors(ok());
    expect(header(res, "Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("secureResponse — одна точка входу", () => {
  it("поєднує заголовки безпеки й CORS, зберігаючи тіло", async () => {
    const res = secureResponse(ok(), { csp: true, url: PROD });
    expect(header(res, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(res, "Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(header(res, "Access-Control-Allow-Origin")).toBe("https://app.wwwuabot.com");
    expect(await res.text()).toBe("body");
  });
});
