/**
 * Сторожі публічного профілю.
 *
 * Тут ламається мовчки найгірше: приватне поле, яке все ж поїхало у відповідь.
 * Тому перевіряється не «чи працює розбір», а саме межа — що **не** віддається
 * ніколи: закриті поля, порожні значення й будь-які дані Telegram.
 *
 * @module @wwwuabot/shared/user/public-profile.test
 */

import { describe, expect, it } from "vitest";
import {
  ABOUT_MAX_LENGTH,
  DEFAULT_OPEN_FIELDS,
  PUBLIC_PROFILE_FIELDS,
  isEmptyPublicProfile,
  isProfilePublic,
  parsePublicFields,
  publicProfileLabel,
  publicProfileView,
  serializePublicFields,
  validateAbout,
} from "./public-profile";

const source = {
  id: 42,
  platformUsername: "karas",
  photoUrl: "https://cdn.example.com/k.jpg",
  about: "Люблю гори",
  role: "user",
  tariff: "pro",
  status: "active",
  language: "uk",
  createdAt: "2026-01-02 03:04:05",
};

describe("набір відкритих полів", () => {
  it("без збереженого значення відкрито рівно типові три", () => {
    // Порожній список і «не вирішували» — різні стани: друге дає типове,
    // перше лишається свідомим «усе закрито».
    for (const raw of [null, undefined, ""]) {
      expect(parsePublicFields(raw)).toEqual([...DEFAULT_OPEN_FIELDS]);
    }
    expect(parsePublicFields("[]")).toEqual([]);
  });

  it("невідомі ключі відкидаються, порядок канонічний", () => {
    const fields = parsePublicFields('["tariff","photo","magic","role"]');
    expect(fields).toEqual(["photo", "role", "tariff"]);
    expect(parsePublicFields(["tariff", "photo"]).length).toBe(2);
  });

  it("список через кому читається як масив — колонка в базі мягка", () => {
    expect(parsePublicFields("photo, about")).toEqual(["photo", "about"]);
  });

  it("запис читається тим самим розбором", () => {
    const stored = serializePublicFields(["role", "photo", "мусор"]);
    expect(parsePublicFields(stored)).toEqual(["photo", "role"]);
  });

  it('прапорець публічності: так — це 1, "1", true; решта — ні', () => {
    for (const raw of [1, "1", true]) expect(isProfilePublic(raw)).toBe(true);
    for (const raw of [0, "0", false, null, undefined, "yes"])
      expect(isProfilePublic(raw)).toBe(false);
  });
});

describe("«Про себе»", () => {
  it("краї обрізаються, порожнє — законний стан", () => {
    expect(validateAbout("  привіт  ")).toEqual({ ok: true, value: "привіт" });
    expect(validateAbout(null)).toEqual({ ok: true, value: "" });
  });

  it("довше за межу — відмова з причиною, а не обрізаний текст", () => {
    const result = validateAbout("я".repeat(ABOUT_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
    expect(validateAbout("я".repeat(ABOUT_MAX_LENGTH)).ok).toBe(true);
  });
});

describe("те, що бачать інші", () => {
  it("⛔ закрите поле не потрапляє у відповідь — навіть заповнене", () => {
    const view = publicProfileView(source, ["platformUsername", "about"]);
    expect(Object.keys(view).sort()).toEqual(["about", "id", "platformUsername"]);
    expect(view).not.toHaveProperty("photoUrl");
    expect(view).not.toHaveProperty("role");
    expect(view).not.toHaveProperty("tariff");
  });

  it("⛔ порожнє значення не створює ключа взагалі", () => {
    const view = publicProfileView({ id: 7, platformUsername: "  ", about: "" }, [
      ...PUBLIC_PROFILE_FIELDS,
    ]);
    expect(view).toEqual({ id: 7 });
    expect(isEmptyPublicProfile(view)).toBe(true);
  });

  it("відкрите й заповнене доїжджає як є", () => {
    const view = publicProfileView(source, ["platformUsername", "photo", "createdAt"]);
    expect(view).toEqual({
      id: 42,
      platformUsername: "karas",
      photoUrl: "https://cdn.example.com/k.jpg",
      createdAt: "2026-01-02 03:04:05",
    });
  });

  it("нічого не відкрито — картка лишається самою собою (номер), і це видно", () => {
    const view = publicProfileView(source, []);
    expect(view).toEqual({ id: 42 });
    expect(isEmptyPublicProfile(view)).toBe(true);
  });

  it("ім'я для показу йде з `#`, як у всьому продукті", () => {
    expect(publicProfileLabel(publicProfileView(source, ["platformUsername"]))).toBe("#karas");
    expect(publicProfileLabel(publicProfileView(source, []))).toBeUndefined();
  });
});
