/**
 * Тести текстів бота.
 *
 * Фіксують найдорожче: у прод-середовищі користувач **не** має бачити
 * діагностику для розробника. Саме це раніше й ламалось — код чекав `"prod"`,
 * а `wrangler.toml` віддавав `"dev"`.
 */

import { describe, expect, it } from "vitest";
import { TEXTS } from "./texts";

describe("TEXTS.error", () => {
  it("у проді показує ввічливе повідомлення, без «Dev mode»", () => {
    const message = TEXTS.error("production");

    expect(message).not.toContain("Dev mode");
    expect(message).toContain("технічна помилка");
  });

  it("поза продом лишає підказку для розробника", () => {
    expect(TEXTS.error("dev")).toContain("Dev mode");
  });
});
