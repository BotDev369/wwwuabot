/**
 * `parsePageConfig` віддає одну форму для будь-яких даних у базі: зона може
 * зникнути, `order` приїхати рядком, блок — без `props`.
 *
 * @module packages/shared/src/types/page-config.utils.test
 */

import { describe, expect, it } from "vitest";
import { createEmptyPageConfig, normalizePageConfig, parsePageConfig } from "./page-config.utils";

describe("parsePageConfig", () => {
  it("доповнює відсутні зони порожніми масивами", () => {
    const config = parsePageConfig(
      JSON.stringify({
        version: 1,
        zones: { main: [{ id: "a", type: "text", order: 0, props: {} }] },
      }),
    );

    expect(config).not.toBeNull();
    expect(config!.zones.main).toHaveLength(1);
    expect(config!.zones.sidebar).toEqual([]);
    expect(config!.zones.header).toEqual([]);
    expect(config!.zones.footer).toEqual([]);
  });

  it("відкидає блок без типу, бо такий блок не рендериться", () => {
    const config = parsePageConfig(
      JSON.stringify({
        version: 1,
        zones: {
          main: [
            { id: "a", order: 0, props: {} },
            { id: "b", type: "text", order: 1, props: {} },
          ],
        },
      }),
    );

    expect(config!.zones.main.map((block) => block.id)).toEqual(["b"]);
  });

  it("приводить order до числа — інакше сортування дає NaN", () => {
    const config = parsePageConfig(
      JSON.stringify({
        version: 1,
        zones: {
          main: [
            { id: "b", type: "text", order: "2", props: {} },
            { id: "a", type: "text", order: 1, props: {} },
          ],
        },
      }),
    );

    expect(config!.zones.main.map((block) => block.order)).toEqual([2, 1]);
    const sorted = [...config!.zones.main].sort((a, b) => a.order - b.order);
    expect(sorted.map((block) => block.id)).toEqual(["a", "b"]);
  });

  it("дає блокові id, якщо його немає, і порожні props замість null", () => {
    const config = parsePageConfig(
      JSON.stringify({ version: 1, zones: { main: [{ type: "divider", order: 0, props: null }] } }),
    );

    const block = config!.zones.main[0];
    expect(block.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(block.props).toEqual({});
  });

  it("нормалізує вкладені блоки тією самою формою", () => {
    const config = parsePageConfig(
      JSON.stringify({
        version: 1,
        zones: {
          main: [
            {
              id: "card",
              type: "card",
              order: 0,
              props: { title: "Картка" },
              children: [{ type: "text", props: { content: "усередині" } }],
            },
          ],
        },
      }),
    );

    const child = config!.zones.main[0].children![0];
    expect(child.type).toBe("text");
    expect(typeof child.order).toBe("number");
  });

  it("лишає тільки справжні зони у visibleZones", () => {
    const config = parsePageConfig(
      JSON.stringify({ version: 1, zones: {}, visibleZones: ["main", "main", "staging"] }),
    );

    expect(config!.visibleZones).toEqual(["main"]);
  });

  it("не чіпає валідну сторінку — вона вже в канонічній формі", () => {
    const page = createEmptyPageConfig();
    page.zones.main.push({ id: "x", type: "text", order: 0, props: { content: "привіт" } });
    page.visibleZones = ["main"];

    expect(parsePageConfig(JSON.stringify(page))).toEqual(page);
    expect(normalizePageConfig(page)).toEqual(page);
  });

  it("повертає null на битих даних, а не кидає", () => {
    expect(parsePageConfig(null)).toBeNull();
    expect(parsePageConfig("не json")).toBeNull();
    expect(parsePageConfig("[]")).toBeNull();
    expect(parsePageConfig(JSON.stringify({ hello: "world" }))).toBeNull();
  });
});
