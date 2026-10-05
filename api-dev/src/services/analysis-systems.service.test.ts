/**
 * Реєстр систем аналізу: що сервіс показує, а що приховує. `implemented = 0`
 * лишається у списку (система описана, формули ще немає — прибрати її означало
 * б викинути обіцянку), `is_active = 0` не показується (його вимикає власник),
 * а порядок і параметри — з бази. D1 — фейковий: перевіряється рішення сервісу.
 *
 * @module api-dev/src/services/analysis-systems.service.test
 */

import { describe, expect, it } from "vitest";

import { listAnalysisSystems, listImplementedSystems } from "./analysis-systems.service";

interface Captured {
  sql: string;
  binds: unknown[];
}

function makeDb(rows: Array<Record<string, unknown>>): {
  db: D1Database;
  statements: Captured[];
} {
  const statements: Captured[] = [];
  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      statements.push(record);
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => null,
        all: async () => {
          if (/PRAGMA|sqlite_master/.test(sql)) return { results: [] };
          // Умова вимкнення виконується тут справжня: інакше тест «вимкненої
          // системи немає» перевіряв би лише те, що фільтр є в тексті запиту.
          const visible = /COALESCE\(is_active, 1\) = 1/.test(sql)
            ? rows.filter((row) => Number(row.is_active ?? 1) === 1)
            : rows;
          // Порядок із запиту: тест має впасти, якщо SQL перестане впорядковувати.
          const sorted = /ORDER BY position/.test(sql)
            ? [...visible].sort(
                (left, right) => Number(left.position ?? 0) - Number(right.position ?? 0),
              )
            : visible;
          return { results: sorted };
        },
        run: async () => ({ meta: { changes: 1 } }),
      };
      return statement;
    },
  };
  return { db: db as unknown as D1Database, statements };
}

const WESTERN = {
  id: "western",
  name: "Західна астрологія",
  description: "Положення Сонця.",
  parameters: '[{"key":"sunSign","label":"Знак Сонця"}]',
  implemented: 1,
  is_active: 1,
};

const CHINESE = {
  id: "chinese",
  name: "Китайська астрологія",
  description: "Ціли та знаки тварин.",
  parameters: '[{"key":"zodiacAnimal","label":"Тварина"}]',
  implemented: 0,
  is_active: 1,
};

describe("реєстр із бази", () => {
  it("порядок і назви приходять із бази, а не з коду", async () => {
    // У базі навмисно покладемо систему з більшою позицією **першою**: якщо
    // запит перестане впорядковувати за `position`, тест цього не помітить.
    const { db } = makeDb([
      { ...CHINESE, position: 20 },
      { ...WESTERN, position: 10 },
    ]);
    const systems = await listAnalysisSystems(db);

    expect(systems.map((system) => system.id)).toEqual(["western", "chinese"]);
    expect(systems[0].name).toBe("Західна астрологія");
  });

  it("система без формули лишається у списку — це обіцянка, а не помилка", async () => {
    const { db } = makeDb([WESTERN, CHINESE]);
    const systems = await listAnalysisSystems(db);

    expect(systems[1].implemented).toBe(false);
  });

  it("до розрахунку беруться лише ті, для кого формула є", async () => {
    const { db } = makeDb([WESTERN, CHINESE]);
    expect((await listImplementedSystems(db)).map((system) => system.id)).toEqual(["western"]);
  });

  it("вимкненої системи в списку немає — її забрав власник", async () => {
    const { db } = makeDb([WESTERN, { ...CHINESE, is_active: 0 }]);
    const { db: checking, statements } = makeDb([{ ...CHINESE, is_active: 0 }]);

    expect((await listAnalysisSystems(db)).map((system) => system.id)).toEqual(["western"]);
    // Вимкнення відсікає сам запит, а не код: список іде з умовою в SQL.
    await listAnalysisSystems(checking);
    expect(statements.some((s) => /COALESCE\(is_active, 1\) = 1/.test(s.sql))).toBe(true);
  });

  it("порожній реєстр — це порожній список, а не падіння", async () => {
    const { db } = makeDb([]);
    expect(await listAnalysisSystems(db)).toEqual([]);
  });
});

describe("параметри системи", () => {
  it("читаються з JSON-колонки як масив", async () => {
    const { db } = makeDb([WESTERN]);
    expect((await listAnalysisSystems(db))[0].parameters).toEqual([
      { key: "sunSign", label: "Знак Сонця" },
    ]);
  });

  it("поламаний JSON не робить систему нечитабельною", async () => {
    const { db } = makeDb([{ ...WESTERN, parameters: "{не json" }]);
    expect((await listAnalysisSystems(db))[0].parameters).toEqual([]);
  });

  it("запис без підпису показує ключ — інакше параметр лишився б без назви", async () => {
    const { db } = makeDb([{ ...WESTERN, parameters: '[{"key":"decan"}]' }]);
    expect((await listAnalysisSystems(db))[0].parameters).toEqual([
      { key: "decan", label: "decan" },
    ]);
  });

  it("не-об'єкт у параметрах відсікається, а не потрапляє в розмітку", async () => {
    const { db } = makeDb([{ ...WESTERN, parameters: '["sunSign", 7]' }]);
    expect((await listAnalysisSystems(db))[0].parameters).toEqual([]);
  });
});
