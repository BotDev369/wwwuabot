/**
 * Правила доступу до сторінки — власник і адміни.
 *
 * Тут фіксується те, чого не видно з даних: **роль** (власник старший за
 * адміна), **хто саме веде** магазин, і те, що зіпсована колонка не відбирає
 * доступ у власника. Останнє — не перестраховка: `admin_ids` лежить JSON-ом у
 * `TEXT`, і жодне обмеження схеми його не перевіряє, тож єдиний захист —
 * читання, яке не падає на смітті.
 *
 * @module @wwwuabot/shared/pages/access.test
 */

import { describe, expect, it } from "vitest";
import {
  PAGE_ADMINS_MAX,
  adminIdError,
  adminIdsJson,
  cleanAdminIds,
  isPageManager,
  pageAdminIds,
  pageAdminsOf,
  pageRole,
  pageStaffIds,
} from "./access";
import type { UserPage } from "./types";

const OWNER = 372567448;
const GALYA = 1049272067;

describe("колонка `admin_ids`", () => {
  it("`NULL` — це «адмінів немає», а не помилка: колонку додано наявній таблиці", () => {
    expect(pageAdminIds(null)).toEqual([]);
    expect(pageAdminIds(undefined)).toEqual([]);
    expect(pageAdminIds("")).toEqual([]);
  });

  it("сміття в колонці не відбирає доступ — читається як «нікого»", () => {
    expect(pageAdminIds("{не json}")).toEqual([]);
    expect(pageAdminIds('"1049272067"')).toEqual([]);
    expect(pageAdminIds('[0, -3, "ж", null]')).toEqual([]);
  });

  it("числа й рядки з колонки читаються однаково: id у JSON буває обома", () => {
    expect(pageAdminIds(`[${GALYA}, "372567448"]`)).toEqual([GALYA, OWNER]);
  });

  it("дублі й перебір прибираються на записі — у JSON-колонці `CHECK` не поставити", () => {
    const many = Array.from({ length: PAGE_ADMINS_MAX + 5 }, (_, i) => 1000 + i);
    expect(cleanAdminIds([GALYA, GALYA, 0])).toEqual([GALYA]);
    expect(cleanAdminIds(many)).toHaveLength(PAGE_ADMINS_MAX);
  });

  it("запис і читання сходяться: колонка — те саме, що поклав сервіс", () => {
    expect(pageAdminIds(adminIdsJson([GALYA, OWNER]))).toEqual([GALYA, OWNER]);
  });
});

describe("роль людини на сторінці", () => {
  it("власник — старший, навіть якщо він же стоїть в адмінах", () => {
    expect(pageRole(OWNER, [OWNER], OWNER)).toBe("owner");
  });

  it("адмін веде сторінку, але не володіє нею", () => {
    expect(pageRole(OWNER, [GALYA], GALYA)).toBe("admin");
    expect(isPageManager(OWNER, [GALYA], GALYA)).toBe(true);
  });

  it("стороння людина — `null`: сторінки для неї не існує", () => {
    expect(pageRole(OWNER, [GALYA], 999)).toBeNull();
    expect(isPageManager(OWNER, [], 999)).toBe(false);
  });

  it("сторінка без власника (контент платформи) нікому не належить", () => {
    expect(pageRole(null, [], OWNER)).toBeNull();
    // Але адмін, названий у колонці, усе одно її веде: `owner_id` порожній буває
    // лише в рядків платформи, і тоді список — єдина ознака доступу.
    expect(pageRole(null, [GALYA], GALYA)).toBe("admin");
  });
});

describe("хто отримує замовлення й повідомлення покупця", () => {
  it("власник першим, далі адміни — і жодного разу вдвічі", () => {
    expect(pageStaffIds(OWNER, [GALYA, OWNER])).toEqual([OWNER, GALYA]);
  });

  it("без адмінів лишається власник: черга не буває без господаря", () => {
    expect(pageStaffIds(OWNER, [])).toEqual([OWNER]);
  });

  it("склад адмінів виводиться зі `staff`, а не тримається другою копією", () => {
    const page = {
      staff: [
        { id: OWNER, name: "#karas", role: "owner" },
        { id: GALYA, name: "#galyashop", role: "admin" },
      ],
    } as Pick<UserPage, "staff">;

    expect(pageAdminsOf(page as UserPage)).toEqual([GALYA]);
  });
});

describe("поле «Telegram ID»", () => {
  it("порожнє й не-числове значення називають причину", () => {
    expect(adminIdError(" ")).toBe("Впишіть Telegram ID");
    expect(adminIdError("Галина")).toBe("Telegram ID — це лише цифри");
    expect(adminIdError("-5")).toBe("Telegram ID — це лише цифри");
    expect(adminIdError("0")).toBe("Не схоже на Telegram ID");
  });

  it("того, хто вже адміністратор, не додають удруге", () => {
    expect(adminIdError(String(GALYA), [GALYA])).toBe("Ця людина вже адміністратор");
  });

  it("справжній id проходить без зауважень", () => {
    expect(adminIdError(String(GALYA), [])).toBeNull();
  });
});
