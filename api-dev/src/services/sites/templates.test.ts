import { describe, it, expect } from "vitest";
import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  getTemplates,
  updateTemplate,
} from "./templates";
import { createFakeDb, templateRow } from "./fake-db";

/**
 * Тести CRUD шаблонів.
 *
 * Системний шаблон (`is_system = 1`) належить продукту, а не користувачу: його
 * видно всім, і змінити його означає змінити спільний контент у всіх. Тому
 * `updateTemplate` і `deleteTemplate` на системному мусять **нічого не робити** —
 * і саме це (плюс відсутність запису в базу) тут перевіряється.
 *
 * @module api-dev/src/services/sites/templates.test
 */

describe("createTemplate", () => {
  it("створює користувацький шаблон, ніколи не системний", async () => {
    const fake = createFakeDb(() => ({}));

    const template = await createTemplate(fake.db, {
      name: "Мій шаблон",
      type: "page",
      config: { pageData: { version: 1 } },
      ownerId: 5,
    });

    const insert = fake.writes[0];
    expect(insert.sql).toContain("is_system, owner_id, tags, created_at");
    expect(insert.sql).toContain("0, ?, ?, ?");
    expect(insert.bindings[6]).toBe(5); // owner_id
    expect(insert.bindings[7]).toBe("[]"); // tags за замовчуванням
    expect(template.isSystem).toBe(false);
  });

  it("зберігає теги й конфігурацію як JSON", async () => {
    const fake = createFakeDb(() => ({}));

    await createTemplate(fake.db, {
      name: "T",
      type: "site",
      config: { pages: [] },
      tags: ["бізнес", "візитка"],
    });

    const insert = fake.writes[0];
    expect(JSON.parse(String(insert.bindings[5]))).toEqual({ pages: [] });
    expect(JSON.parse(String(insert.bindings[7]))).toEqual(["бізнес", "візитка"]);
  });
});

describe("читання шаблонів", () => {
  it("без користувача віддає лише системні", async () => {
    const fake = createFakeDb(() => ({ results: [templateRow({ is_system: 1, owner_id: null })] }));

    const templates = await getTemplates(fake.db);

    expect(fake.reads[0].sql).toBe(
      "SELECT * FROM templates WHERE is_system = 1 ORDER BY created_at DESC",
    );
    expect(templates[0].isSystem).toBe(true);
    expect(templates[0].ownerId).toBeUndefined();
  });

  it("з користувачем додає його власні", async () => {
    const fake = createFakeDb(() => ({ results: [] }));

    await getTemplates(fake.db, 5);

    expect(fake.reads[0].sql).toContain("WHERE is_system = 1 OR owner_id = ?");
    expect(fake.reads[0].bindings).toEqual([5]);
  });

  it("getTemplateById повертає null для невідомого id", async () => {
    const fake = createFakeDb(() => null);

    await expect(getTemplateById(fake.db, "no-such")).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });
});

describe("updateTemplate", () => {
  it("оновлює користувацький шаблон", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM templates WHERE id = ?") ? templateRow() : {},
    );

    await updateTemplate(fake.db, "tpl-1", { name: "Нова назва", tags: ["a"] });

    const update = fake.writes[0];
    expect(update.sql).toBe("UPDATE templates SET name = ?, tags = ? WHERE id = ?");
    expect(update.bindings).toEqual(["Нова назва", '["a"]', "tpl-1"]);
  });

  it("⛔ не чіпає системний шаблон", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM templates WHERE id = ?")
        ? templateRow({ is_system: 1, owner_id: null })
        : {},
    );

    await expect(updateTemplate(fake.db, "tpl-1", { name: "Перебити" })).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });

  it("не пише в базу, якщо оновлювати нічого", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM templates WHERE id = ?") ? templateRow() : {},
    );

    const template = await updateTemplate(fake.db, "tpl-1", {});

    expect(template?.id).toBe("tpl-1");
    expect(fake.writes).toHaveLength(0);
  });
});

describe("deleteTemplate", () => {
  it("видаляє користувацький шаблон", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM templates WHERE id = ?")
        ? templateRow()
        : { meta: { changes: 1 } },
    );

    await expect(deleteTemplate(fake.db, "tpl-1")).resolves.toBe(true);
    expect(fake.writes[0].bindings).toEqual(["tpl-1"]);
  });

  it("⛔ не видаляє системний шаблон", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM templates WHERE id = ?")
        ? templateRow({ is_system: 1, owner_id: null })
        : { meta: { changes: 1 } },
    );

    await expect(deleteTemplate(fake.db, "tpl-1")).resolves.toBe(false);
    expect(fake.writes).toHaveLength(0);
  });

  it("повертає false, коли D1 не змінив жодного рядка", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM templates WHERE id = ?")
        ? templateRow()
        : { meta: { changes: 0 } },
    );

    await expect(deleteTemplate(fake.db, "tpl-1")).resolves.toBe(false);
  });
});
