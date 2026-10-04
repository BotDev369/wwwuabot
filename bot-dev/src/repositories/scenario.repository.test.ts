/**
 * Читач контенту в боті: рядок `scenarios` → екран, який бачить людина.
 *
 * Тут живуть рішення, які ламаються мовчки й коштують дорого:
 *
 * 1. **Видимість.** Приватна сторінка (`owner_id` є, `is_public = 0`) не має
 *    бути досяжною і в боті — бот такий самий публічний вхід, як веб, тож
 *    «приватна» сторінка з діплінком була б кнопкою, яка бреше
 *    (`docs/SPACE.md`). Умова живе в SQL, її легко зняти одним рядком.
 * 2. **Розбір чужого JSON.** `buttons` і `rich_data` приходять із редактора
 *    людини: зіпсований рядок не має роняти весь екран — має стати порожнім
 *    масивом із записом у лог. Мовчазно проглочений JSON навпаки виглядає як
 *    «кнопок немає», і людина шукає помилку там, де її немає.
 * 3. **Підпис сторінки з шаблону** виводиться з того самого `page_data`, який
 *    рендерить веб, і мусить екрануватися: бот надсилає `parse_mode: HTML`,
 *    а `<` у тексті, написаному людиною, зламав би розмітку.
 *
 * D1 у тесті — фейковий: перевіряється не сервер SQLite, а рішення репозиторію
 * (умова в SQL, розбір рядків, маршрутизація payload).
 */

/// <reference types="node" />

import { describe, expect, it, vi } from "vitest";
import { buildPageConfig, pageTemplate } from "@wwwuabot/shared/pages";

import { ScenarioRepository } from "./scenario.repository";
import type { ScenarioRow } from "../shared/types/scenario";
import type { Env } from "../shared/types/env";

/** Справжній рядок `scenarios`; усі поля, які читає репозиторій,явно. */
function row(overrides: Partial<ScenarioRow> = {}): ScenarioRow {
  return {
    id: 7,
    slug: "shop",
    title: "Майстерня",
    photo_url: "https://cdn.example/photo.jpg",
    caption_top: null,
    caption_mid: null,
    caption_bot: null,
    keyboard_type: "reply",
    buttons: "[]",
    awaits_input: null,
    input_path: null,
    input_next: null,
    price: null,
    qty_options: null,
    notify_groups: null,
    notify_template: null,
    rich_message: null,
    rich_data: null,
    page_data: null,
    template_key: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}

/** Фейковий D1: запам'ятовує SQL і віддає підготовлені рядки. */
function makeDb(rows: ScenarioRow[], contentRows?: Partial<ScenarioRow>[]) {
  const queries: string[] = [];
  const db = {
    prepare(sql: string) {
      queries.push(sql);
      return {
        bind() {
          return {
            first: async () => rows[0] ?? null,
          };
        },
        all: async () => ({
          results: (contentRows ?? rows).map((one) => ({
            id: one.id ?? null,
            slug: one.slug,
            title: one.title ?? null,
            photo_url: one.photo_url ?? null,
            page_data: one.page_data ?? null,
            template_key: one.template_key ?? null,
            is_active: 1,
          })),
        }),
      };
    },
  };
  return { db: db as unknown as D1Database, queries };
}

function makeRepo(
  rows: ScenarioRow[],
  contentRows?: Partial<ScenarioRow>[],
): {
  repo: ScenarioRepository;
  queries: string[];
} {
  const { db, queries } = makeDb(rows, contentRows);
  const env = { DB: db, BOT_TOKEN: "t", SECRET_TOKEN: "s", ENVIRONMENT: "dev" } as Env;
  return { repo: new ScenarioRepository(env), queries };
}

describe("ScenarioRepository — видимість", () => {
  it("⛔ приватна сторінка не віддається назовні: умова в кожному запиті", async () => {
    const { repo, queries } = makeRepo([row()]);

    await repo.getScenario("shop");
    await repo.getScenarioByBotPayload("shop");

    // Три запити: сторінка за адресою, список кандидатів для payload і та сама
    // адреса вже з маршруту.
    expect(queries).toHaveLength(3);
    for (const sql of queries) {
      expect(sql).toContain("owner_id IS NULL OR COALESCE(is_public, 0) = 1");
    }
  });

  it("головна сторінка теж проходить ту саму умову", async () => {
    const { repo, queries } = makeRepo([row({ slug: "" })]);
    await repo.getScenario("");
    expect(queries[0]).toContain("COALESCE(is_public, 0) = 1");
  });
});

describe("ScenarioRepository — розбір рядка", () => {
  it("кнопки з редактора стають масивом", async () => {
    const { repo } = makeRepo([row({ buttons: JSON.stringify([[{ text: "Далі" }]]) })]);
    const scenario = await repo.getScenario("shop");
    expect(scenario?.buttons).toEqual([[{ text: "Далі" }]]);
  });

  it("зіпсований JSON кнопок не роняє екран — порожній масив і запис у лог", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { repo } = makeRepo([row({ buttons: "{не json" })]);

    const scenario = await repo.getScenario("shop");

    expect(scenario?.buttons).toEqual([]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("JSON, який не масив, теж не стає кнопками", async () => {
    const { repo } = makeRepo([row({ buttons: JSON.stringify({ text: "Далі" }) })]);
    expect((await repo.getScenario("shop"))?.buttons).toEqual([]);
  });

  it("rich_data приймається тільки масивом блоків", async () => {
    const { repo } = makeRepo([row({ rich_data: JSON.stringify([{ type: "text" }]) })]);
    expect((await repo.getScenario("shop"))?.rich_data).toEqual([{ type: "text" }]);
  });

  it("rich_data-об'єкт і битий рядок дають null, а не половинний контент", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { repo } = makeRepo([row({ rich_data: JSON.stringify({ type: "text" }) })]);

    expect((await repo.getScenario("shop"))?.rich_data).toBeNull();

    const broken = makeRepo([row({ rich_data: "[{" })]);
    expect((await broken.repo.getScenario("shop"))?.rich_data).toBeNull();

    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("порожній рядок rich_data — це тиша, а не помилка", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { repo } = makeRepo([row({ rich_data: "   " })]);
    expect((await repo.getScenario("shop"))?.rich_data).toBeNull();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("rich_message лише тоді так, коли рядок каже «так»", async () => {
    for (const [value, expected] of [
      ["true", true],
      ["1", true],
      ["false", false],
      [null, false],
    ] as const) {
      const { repo } = makeRepo([row({ rich_message: value })]);
      expect((await repo.getScenario("shop"))?.rich_message).toBe(expected);
    }
  });

  it("ціна з рядка стає числом, порожня — null", async () => {
    const priced = makeRepo([row({ price: "12.50" })]);
    expect((await priced.repo.getScenario("shop"))?.price).toBe(12.5);

    const free = makeRepo([row({ price: null })]);
    expect((await free.repo.getScenario("shop"))?.price).toBeNull();
  });
});

describe("ScenarioRepository — підпис і маршрут", () => {
  it("підпис сторінки з шаблону береться з page_data", async () => {
    const { repo } = makeRepo([
      row({
        slug: "olena",
        template_key: "card",
        page_data: JSON.stringify(
          buildPageConfig(pageTemplate("card"), { title: "Олена", tagline: "Роблю сайти" }),
        ),
      }),
    ]);

    const scenario = await repo.getScenario("olena");

    expect(scenario?.caption_top).toBe("Олена\n\nРоблю сайти");
  });

  it("готовий підпис автора не перезаписується виведеним", async () => {
    const { repo } = makeRepo([
      row({
        slug: "olena",
        template_key: "card",
        caption_top: "Моє слово",
        page_data: JSON.stringify(buildPageConfig(pageTemplate("card"), { title: "Олена" })),
      }),
    ]);

    expect((await repo.getScenario("olena"))?.caption_top).toBe("Моє слово");
  });

  it("контент платформи без шаблону не отримує виведеного підпису", async () => {
    const { repo } = makeRepo([row({ template_key: null, caption_top: null })]);
    expect((await repo.getScenario("shop"))?.caption_top).toBeNull();
  });

  it("невідомий payload не відкриває ніщо", async () => {
    const { repo } = makeRepo([row({ slug: "shop" })]);
    expect(await repo.getScenarioByBotPayload("unknown")).toBeNull();
  });

  it("payload знаходить сторінку й дописує повний веб-шлях", async () => {
    const { repo } = makeRepo([row({ slug: "shop" })]);
    const scenario = await repo.getScenarioByBotPayload("shop_item");
    expect(scenario?.slug).toBe("shop");
    expect(scenario?.web_path).toBe("/shop/item");
  });

  it("неактивна сторінка не потрапляє в маршрут: фільтр у самому SELECT", async () => {
    const { repo, queries } = makeRepo([row({ slug: "shop" })]);
    await repo.getScenarioByBotPayload("shop");
    expect(queries[0]).toContain("is_active = 1");
  });
});
