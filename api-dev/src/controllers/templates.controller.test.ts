import { describe, it, expect } from "vitest";
import { canReadTemplate } from "./templates.controller";

/**
 * Тести чистого правила доступу до шаблону.
 *
 * Регресія: `GET /api/templates/:id` довгий час не перевіряв власника
 * взагалі — конфігурацію чужого шаблону можна було прочитати за UUID.
 * Див. docs/CONSOLIDATION_LOG.md §5.4.
 */
describe("canReadTemplate", () => {
  it("системний шаблон читає будь-хто, навіть без ідентичності", () => {
    expect(canReadTemplate({ isSystem: true }, null)).toBe(true);
    expect(canReadTemplate({ isSystem: true, ownerId: 5 }, null)).toBe(true);
  });

  it("власник читає свій приватний шаблон", () => {
    expect(canReadTemplate({ isSystem: false, ownerId: 5 }, 5)).toBe(true);
  });

  it("⛔ НЕ віддає приватний шаблон чужому користувачу", () => {
    expect(canReadTemplate({ isSystem: false, ownerId: 5 }, 6)).toBe(false);
  });

  it("⛔ НЕ віддає приватний шаблон аноніму", () => {
    expect(canReadTemplate({ isSystem: false, ownerId: 5 }, null)).toBe(false);
  });

  it("⛔ НЕ віддає приватний шаблон без власника", () => {
    expect(canReadTemplate({ isSystem: false }, null)).toBe(false);
    expect(canReadTemplate({ isSystem: false }, 5)).toBe(false);
  });
});
