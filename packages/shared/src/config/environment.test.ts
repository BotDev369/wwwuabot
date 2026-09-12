import { describe, expect, it } from "vitest";
import { ENV_DEV, ENV_PRODUCTION, isProduction } from "./environment";

describe("isProduction", () => {
  it("прод — тільки явне `production`", () => {
    expect(isProduction(ENV_PRODUCTION)).toBe(true);
  });

  it("dev — не прод", () => {
    expect(isProduction(ENV_DEV)).toBe(false);
  });

  it("порожнє або відсутнє значення трактується як дев, а не як прод", () => {
    // Свідомий перекіс у безпечний бік: краще показати підказку для
    // розробника в деві, ніж діагностику — користувачам у проді.
    expect(isProduction(undefined)).toBe(false);
    expect(isProduction("")).toBe(false);
  });

  it("застаріле `prod` не вважається продом", () => {
    // Саме ця розбіжність колись дала «Сталася помилка (Dev mode)».
    expect(isProduction("prod")).toBe(false);
  });

  it("регістр і пробіли не рятують — потрібне рівно `production`", () => {
    expect(isProduction("Production")).toBe(false);
    expect(isProduction(" production ")).toBe(false);
  });
});
