import { describe, expect, it } from "vitest";
import { copyText } from "./clipboard";

/** Підміняє `navigator` на час тесту: у середовищі тестів буфера немає. */
async function withNavigator(value: unknown, run: () => Promise<boolean>): Promise<boolean> {
  const original = globalThis.navigator;
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
  try {
    return await run();
  } finally {
    Object.defineProperty(globalThis, "navigator", { value: original, configurable: true });
  }
}

/**
 * Копіювання — те, що ламається мовчки: у WebView Telegram сучасного
 * `navigator.clipboard` може не бути, і тоді без відкату посилання просто
 * нікуди не потрапляє, а людина про це не дізнається.
 */
describe("copyText", () => {
  it("сучасний буфер копіює одразу, без відкату", async () => {
    const result = await withNavigator({ clipboard: { writeText: async () => undefined } }, () =>
      copyText("посилання"),
    );

    expect(result).toBe(true);
  });

  it("відмова в буфері не видається за вдачу — без відкату каже false", async () => {
    const result = await withNavigator(
      {
        clipboard: {
          writeText: async () => {
            throw new Error("denied");
          },
        },
      },
      () => copyText("посилання"),
    );

    // У середовищі без DOM відкату немає, тож чесна відповідь — `false`: виклик
    // покаже людині, що копіювання не вийшло, замість мовчати.
    expect(result).toBe(false);
  });

  it("без буфера й без DOM теж false, а не мовчанка", async () => {
    const result = await withNavigator(undefined, () => copyText("посилання"));

    expect(result).toBe(false);
  });
});
