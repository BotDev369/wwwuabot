/**
 * Читач контенту в боті: рядок `scenarios` → екран, який бачить людина.
 *
 * Тут живуть рішення, які ламаються мовчки й коштують дорого:
 *
 * 1. **Видимість.** Приватна сторінка (`owner_id` є, `is_public = 0`) не має
 *    бути досяжною і в боті — бот такий самий публічний вхід, як веб, тож
 *    «приватна» сторінка з діплінком була б кнопкою, яка бреше
 *    (`docs/VISIBILITY.md`). Рішення ухвалює `pageVisibleTo`, а не SQL: окрім
 *    публічності, є список глядачів (`viewer_ids`), і в JSON-колонці SQL його
 *    не перевірити.
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

/** Колонки видимості, яких немає в `ScenarioRow`: їх читає гейт, а не екран. */
type GateRow = {
  owner_id?: number | null;
  is_public?: number | null;
  viewer_ids?: string | null;
};

/** Рядок із колонками видимості: `row()` лишається чистим рядком екрана. */
function gated(base: ScenarioRow, gate: GateRow = {}): ScenarioRow & GateRow {
  return { ...base, ...gate };
}

/** Фейковий D1: запам'ятовує SQL і віддає підготовлені рядки. */
function makeDb(rows: (ScenarioRow & GateRow)[], contentRows?: Partial<ScenarioRow & GateRow>[]) {
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
            owner_id: one.owner_id ?? null,
            is_public: one.is_public ?? null,
            viewer_ids: one.viewer_ids ?? null,
          })),
        }),
      };
    },
  };
  return { db: db as unknown as D1Database, queries };
}

function makeRepo(
  rows: (ScenarioRow & GateRow)[],
  contentRows?: Partial<ScenarioRow & GateRow>[],
): {
  repo: ScenarioRepository;
  queries: string[];
} {
  const { db, queries } = makeDb(rows, contentRows);
  const env = { DB: db, BOT_TOKEN: "t", SECRET_TOKEN: "s", ENVIRONMENT: "dev" } as Env;
  return { repo: new ScenarioRepository(env), queries };
}

describe("ScenarioRepository — видимість", () => {
  it("⛔ приватна сторінка не віддається назовні — ні за адресою, ні з payload", async () => {
    const privateRow = gated(row(), { owner_id: 5, is_public: 0, viewer_ids: null });
    const { repo } = makeRepo([privateRow]);

    expect(await repo.getScenario("shop")).toBeNull();
    expect(await repo.getScenarioByBotPayload("shop")).toBeNull();
  });

  it("публічна сторінка й контент платформи проходять", async () => {
    const publicRow = gated(row({ slug: "olena" }), { owner_id: 5, is_public: 1 });
    expect((await makeRepo([publicRow]).repo.getScenario("olena"))?.slug).toBe("olena");

    const platform = gated(row({ slug: "" }), { owner_id: null });
    expect((await makeRepo([platform]).repo.getScenario(""))?.slug).toBe("");
  });

  it("доданий глядач бачить приватну сторінку, чужий — ні", async () => {
    const invited = gated(row(), { owner_id: 5, is_public: 0, viewer_ids: "[7]" });
    const { repo } = makeRepo([invited]);

    expect((await repo.getScenario("shop", 7))?.slug).toBe("shop");
    expect(await repo.getScenario("shop", 8)).toBeNull();
    expect(await repo.getScenario("shop", null)).toBeNull();
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

  it("`/start` без головної сторінки показує сторінку верхнього рівня", async () => {
    const { repo } = makeRepo([
      row({ slug: "shop", title: "Майстреня" }),
      row({ slug: "dateanalysis/analysis", title: "Результат" }),
    ]);

    const scenario = await repo.getScenarioByBotPayload("");

    expect(scenario?.slug).toBe("shop");
    expect(scenario?.web_path).toBe("/shop");
  });

  it("самі вкладені сторінки не стають першим екраном", async () => {
    const { repo } = makeRepo([row({ slug: "dateanalysis/analysis" })]);

    expect(await repo.getScenarioByBotPayload("")).toBeNull();
  });

  it("головна сторінка має перевагу над першою-ліпшою", async () => {
    const { repo } = makeRepo([row({ slug: "", title: "Головна" }), row({ slug: "shop" })]);

    expect((await repo.getScenarioByBotPayload(""))?.slug).toBe("");
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
