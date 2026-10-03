/**
 * Модуль безпеки бота — **межі, які ніхто не бачить на екрані**.
 *
 * Три файли цього модуля не мали жодного тесту: блокування, обрізання
 * тексту, екранування HTML і ліміт апдейтів. Помилка тут не виглядає як
 * помилка — вона виглядає як «юзер надсилає крапки з собакою» або як
 * розмова, яка зникла з нього, тож її легко не помітити.
 *
 * Час у тестах фіксировано: ліміт рахується вікнами по 60 секунд, і без
 * керованого `Date.now` тест або провалиться, або (гірше) пройде випадково.
 *
 * @module bot-dev/src/modules/security/security.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../shared/types/env";
import { blockUser, isUserBlocked, unblockUser } from "./blocked-users";
import { escapeHtml, validateSlug, validateUserText } from "./input-validation";
import { checkRateLimit } from "./rate-limiter";

const USER_ID = 4242;

/** Контекст із людиною: модуль пише лише в `ctx.user` і піднімає `userDirty`. */
function context(user: Record<string, unknown> | null = {}): AppContext {
  return {
    env: {},
    from: { id: USER_ID },
    user: user === null ? undefined : { user_id: USER_ID, ...user },
  } as unknown as AppContext;
}

/** Ліміт — 60 апдейтів на хвилину, автоблокування — 10 порушень за 5 хв. */
const LIMIT_PER_MINUTE = 60;
const AUTO_BLOCK_THRESHOLD = 10;

/** Одна хвилина після початку вікна: час, який усі вікна бачать однаково. */
const NOW = 1_700_000_100_000;

describe("блокування користувача", () => {
  it("заблокований користувач ігнорується, решта — ні", () => {
    expect(isUserBlocked(context({ is_blocked: 1 }))).toBe(true);
    expect(isUserBlocked(context({ is_blocked: true }))).toBe(true);
    expect(isUserBlocked(context({ is_blocked: 0 }))).toBe(false);
    expect(isUserBlocked(context())).toBe(false);
  });

  it("⛔ без людини в контексті блокування не вигадує", () => {
    // `ctx.user` відсутній у неавторизованому апдейті: без цієї перевірки
    // виклик ламається на `ctx.user.user_id`.
    expect(isUserBlocked(context(null))).toBe(false);
    expect(() => blockUser(context(null))).not.toThrow();
    expect(() => unblockUser(context(null))).not.toThrow();
  });

  it("блокування пише прапорець і піднімає userDirty, розблокування — те саме", () => {
    const blocked = context();
    blockUser(blocked);
    expect(blocked.user?.is_blocked).toBe(1);
    expect(blocked.userDirty).toBe(true);

    const unblocked = context({ is_blocked: 1 });
    unblockUser(unblocked);
    expect(unblocked.user?.is_blocked).toBe(0);
    expect(unblocked.userDirty).toBe(true);
  });
});

describe("валідація тексту", () => {
  it("обрізає пробіли й обрізає довгий текст до м'якої межі", () => {
    expect(validateUserText("  привіт  ")).toBe("привіт");
    const long = "я".repeat(1500);
    const result = validateUserText(long);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1000);
  });

  it("⛔ порожній текст і текст поза твердою межею відкидаються", () => {
    expect(validateUserText("   ")).toBeNull();
    // Тверда межа — 4000: понад нею Telegram не прийме підпис узагалі, тому
    // «обрізати» тут означало б згодом отримати помилку від Telegram.
    expect(validateUserText("я".repeat(4001))).toBeNull();
    expect(validateUserText("я".repeat(4000))).toHaveLength(1000);
  });
});

describe("валідація адреси (slug)", () => {
  it("приймає лише малі літери, цифри й дефіси", () => {
    expect(validateSlug("privatni-platformy")).toBe("privatni-platformy");
    expect(validateSlug("a1")).toBe("a1");
  });

  it("⛔ відкидає порожнє, довше за 64, підчервлення, пробіли та верхній регістр", () => {
    expect(validateSlug("")).toBeNull();
    expect(validateSlug("   ")).toBeNull();
    expect(validateSlug("a".repeat(65))).toBeNull();
    expect(validateSlug("a_b")).toBeNull();
    expect(validateSlug("Privatni")).toBeNull();
    expect(validateSlug("-pochatok")).toBeNull();
    expect(validateSlug("kinetsi-")).toBeNull();
    expect(validateSlug("dva slova")).toBeNull();
  });
});

describe("екранування HTML", () => {
  it("нейтралізує теги й лапки, щоб контент не зламав розмітку Telegram", () => {
    expect(escapeHtml("<b>жирний</b>")).toBe("&lt;b&gt;жирний&lt;/b&gt;");
    expect(escapeHtml('" & "')).toBe("&quot; &amp; &quot;");
  });

  it("⛔ амперсанд екранується першим — інакше внутрішні сутності розпадуться", () => {
    // Порядок заміни важливий: якщо спершу обробити `<`, то `&lt;` розпався б на
    // `&amp;lt;` — і користувач бачив би екрановані теги як текст.
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("ліміт апдейтів", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Проганяє `count` перевірок і повертає останній дозвіл. */
  function hammer(ctx: AppContext, count: number): boolean {
    let allowed = true;
    for (let i = 0; i < count; i++) allowed = checkRateLimit(ctx);
    return allowed;
  }

  it("дозволяє до ліміту й записує лічильник у рядок людини", () => {
    const ctx = context();
    expect(hammer(ctx, LIMIT_PER_MINUTE)).toBe(true);
    const data = JSON.parse(String(ctx.user?.rate_limit_json));
    expect(data.window[1]).toBe(LIMIT_PER_MINUTE);
    expect(ctx.userDirty).toBe(true);
    expect(ctx.user?.is_blocked).toBeUndefined();
  });

  it("⛔ перевищення ліміту блокує апдейт і пише порушення", () => {
    const ctx = context();
    expect(hammer(ctx, LIMIT_PER_MINUTE + 1)).toBe(false);
    const data = JSON.parse(String(ctx.user?.rate_limit_json));
    expect(data.violations).toHaveLength(1);
  });

  it("⛔ автоблокування — точно на порозі порушень, а не на першому", () => {
    const ctx = context();
    hammer(ctx, LIMIT_PER_MINUTE); // 60 дозволених, жодного порушення

    for (let violation = 1; violation < AUTO_BLOCK_THRESHOLD; violation++) {
      expect(checkRateLimit(ctx)).toBe(false);
      // ⛔ на передостанньому порушенні блокування ще немає: блокуючи
      // передчасно, ми відрізаємо людину за першу ж групу помилок.
      expect(ctx.user?.is_blocked).toBeUndefined();
    }

    checkRateLimit(ctx); // десяте порушення — поріг
    expect(ctx.user?.is_blocked).toBe(1);
    expect(ctx.userDirty).toBe(true);
  });

  it("нове вікно обнуляє лічильник, але не знімає автоблокування", () => {
    const ctx = context({ is_blocked: 1 });
    hammer(ctx, LIMIT_PER_MINUTE + 1);
    vi.setSystemTime(NOW + 61_000);
    expect(checkRateLimit(ctx)).toBe(true);
    expect(ctx.user?.is_blocked).toBe(1);
  });

  it("⛔ битий rate_limit_json не ламає ліміт — рахунок починається з нуля", () => {
    const ctx = context({ rate_limit_json: "{це не json" });
    expect(checkRateLimit(ctx)).toBe(true);
    const data = JSON.parse(String(ctx.user?.rate_limit_json));
    expect(data.window[1]).toBe(1);
  });

  it("⛔ без людини в контексті ліміт пропускає: блокувати некого", () => {
    expect(checkRateLimit(context(null))).toBe(true);
  });
});
