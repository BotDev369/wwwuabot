import { describe, expect, it } from "vitest";
import { missingScreenTexts, readScreenTexts, screenText } from "./texts";

const page = (main: unknown[], header: unknown[] = []): string =>
  JSON.stringify({
    version: 1,
    zones: { sidebar: [], header, main, footer: [] },
    visibleZones: [],
  });

const text = (id: string, content: unknown): Record<string, unknown> => ({
  id,
  type: "text",
  order: 0,
  props: { content },
});

describe("readScreenTexts", () => {
  it("бере текст блока `text` за його id", () => {
    const texts = readScreenTexts(page([text("services.title", "Сервіси")]));

    expect(texts).toEqual({ "services.title": "Сервіси" });
  });

  it("читає всі зони й дітей — текст усередині картки теж текст екрана", () => {
    const texts = readScreenTexts(
      page(
        [
          {
            id: "card",
            type: "card",
            order: 0,
            props: {},
            children: [text("services.item.games", "Ігри")],
          },
        ],
        [text("services.title", "Сервіси")],
      ),
    );

    expect(texts).toEqual({ "services.title": "Сервіси", "services.item.games": "Ігри" });
  });

  it("не чіпає блоки інших типів: підпис кнопки — не текст екрана", () => {
    const texts = readScreenTexts(
      page([
        text("services.title", "Сервіси"),
        { id: "cta", type: "buttons", order: 1, props: { items: [{ text: "Далі" }] } },
      ]),
    );

    expect(texts).toEqual({ "services.title": "Сервіси" });
  });

  it("порожній або пробільний content не стає текстом", () => {
    const texts = readScreenTexts(page([text("a", ""), text("b", "   "), text("c", 42)]));

    expect(texts).toEqual({});
  });

  it("бите `page_data` і `null` дають порожньо, а не виняток", () => {
    expect(readScreenTexts("{")).toEqual({});
    expect(readScreenTexts(null)).toEqual({});
    expect(readScreenTexts('{"version":99,"zones":{}}')).toEqual({});
  });

  it("приймає вже розібраний конфіг", () => {
    const config = JSON.parse(page([text("services.title", "Сервіси")]));

    expect(readScreenTexts(config)).toEqual({ "services.title": "Сервіси" });
  });
});

describe("screenText і missingScreenTexts", () => {
  it("відсутній ключ — порожній рядок, а не вигаданий текст", () => {
    expect(screenText({ a: "А" }, "a")).toBe("А");
    expect(screenText({ a: "А" }, "b")).toBe("");
  });

  it("звіт називає саме ті ключі, яких немає", () => {
    expect(missingScreenTexts({ a: "А" }, ["a", "b"])).toEqual(["b"]);
  });
});
