/**
 * Картка «Дані від Telegram» — сторож того, що людина бачить у ній.
 *
 * Перелік полів складає `telegram-fields.ts` (там і його власні тести); тут
 * перевіряється саме показ: підписи українською, `@` на юзернеймі, порядок
 * рядків у розмітці, шапка з фото й іменем **усередині тієї самої картки** і те,
 * що нашого дампу в картці немає.
 *
 * @module packages/shared/src/components/user-profile/TelegramSection.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TelegramSection } from "./TelegramSection";
import type { UserProfileData } from "./types";

const USER: UserProfileData = {
  id: 42,
  telegram: {
    id: 372567448,
    first_name: "Diskant Sergiy",
    last_name: "",
    username: "DiskantSergiy",
    language_code: "uk",
    photo_url: "https://t.me/i/userpic/320/karas.jpg",
    allows_write_to_pm: true,
  },
};

describe("TelegramSection", () => {
  it("тримає акаунт і поля в одній картці", () => {
    const html = renderToStaticMarkup(<TelegramSection user={USER} />);

    // Одна картка, а не дві: фото, ім'я й `@юзернейм` — теж дані Telegram, тож
    // окремий блок із ними казав би «ось акаунт, а ось його дані».
    expect(html.match(/class="wb-profile"/g)).toHaveLength(1);
    // Шапка — **до** полів: спершу впізнавання, далі подробиці.
    expect(html.indexOf("wb-account-head")).toBeGreaterThan(html.indexOf("wb-profile-title"));
    expect(html.indexOf("wb-profile-fields")).toBeGreaterThan(html.indexOf("wb-account-head"));
    // Шапка показує повне ім'я й юзернейм із позначкою `@` (AGENTS.md §2).
    expect(html).toContain("Diskant Sergiy");
    expect(html).toContain("@DiskantSergiy");
  });

  it("називає речі так, як їх називає людина: юзернейм, а не хендл", () => {
    const html = renderToStaticMarkup(<TelegramSection user={USER} />);

    expect(html).toContain("Юзернейм");
    expect(html).toContain("@DiskantSergiy");
    expect(html).not.toContain("хендл");
  });

  it("показує преміум і порожніх рядків не лишає", () => {
    const html = renderToStaticMarkup(<TelegramSection user={USER} />);

    expect(html).toContain("Telegram Premium");
    expect(html).toContain("Ні");
    // Прізвище порожнє — рядка немає взагалі, а не «Прізвище …».
    expect(html).not.toContain("Прізвище");
    expect(html).not.toContain("...");
  });

  it("ставить фото в шапку, а не рядком у переліку", () => {
    const html = renderToStaticMarkup(<TelegramSection user={USER} />);

    // Адреса картинки в переліку не додає нічого — сама картинка стоїть у шапці.
    expect(html).not.toContain("Фото профілю");
    expect(html).toContain('<img src="https://t.me/i/userpic/320/karas.jpg"');
    expect(html.indexOf("wb-account-head")).toBeLessThan(html.indexOf("<img"));
  });

  it("ставить поля в сталий порядок", () => {
    const html = renderToStaticMarkup(<TelegramSection user={USER} />);
    const positions = ["Telegram ID", "Юзернейм", "Мова інтерфейсу", "Telegram Premium"].map(
      (label) => html.indexOf(label),
    );

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("не показує ні сирого JSON, ні даних сеансу", () => {
    // Ці поля стояли тут тимчасово — для відловлювання багів, і живуть у логах.
    const user = {
      ...USER,
      telegram: { ...USER.telegram, chat_type: "private", start_param: "mydate" },
    } as UserProfileData;
    const html = renderToStaticMarkup(<TelegramSection user={user} />);

    expect(html).not.toContain("Показати сирий JSON");
    expect(html).not.toContain("Дані сеансу");
    expect(html).not.toContain("private");
  });

  it("без збереженого payload не малює порожньої картки", () => {
    expect(renderToStaticMarkup(<TelegramSection user={{ id: 42, telegram: null }} />)).toBe("");
    expect(renderToStaticMarkup(<TelegramSection user={{ id: 42 }} />)).toBe("");
  });
});
