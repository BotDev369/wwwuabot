/**
 * Облікові картки меню профілю — те, що ламається мовчки.
 *
 * Найважливіше тут — **розділення джерел**: Telegram-хендл і ім'я на платформі
 * роками жили в одному рядку як `platformUsername ?? username`, і підпис «@…»
 * однаково читався як будь-яке з двох (AGENTS.md §2). Це саме той дефект, який
 * не видно на око — він проявляється, коли Telegram-хендл зникає або коли
 * людина змінює ім'я на платформі.
 *
 * Друга річ — порожні поля: «немає» мусить бути сказано, а не лишитись пустим
 * рядком, бо порожня лінія в картці читається як зламаний рендер.
 */

import { describe, expect, it } from "vitest";
import type { UserProfileData } from "@wwwuabot/shared";
import {
  ACCOUNT_LAYOUT_OPTIONS,
  accountCardsClass,
  avatarInitial,
  joinedLine,
  platformHandle,
  telegramHandle,
  telegramName,
} from "./profile-account";

const USER: UserProfileData = {
  id: 42,
  firstName: "Сергій",
  lastName: "Карась",
  username: "karas",
  platformUsername: "karas_portal",
  createdAt: "2026-09-18 09:30:00",
};

describe("облікові картки профілю", () => {
  it("ім'я з Telegram — повне, з двох полів", () => {
    expect(telegramName(USER)).toBe("Сергій Карась");
    expect(telegramName({ id: 1, firstName: "Сергій" })).toBe("Сергій");
    expect(telegramName({ id: 1 })).toBeNull();
  });

  it("Telegram-хендл і ім'я на платформі — різні поля, і не підміняють одне одного", () => {
    // Обидва є — і кожне стоїть на своєму місці.
    expect(telegramHandle(USER)).toBe("@karas");
    expect(platformHandle(USER)).toBe("@karas_portal");

    // Telegram-хендл зник (людина його прибрала) — ім'я на платформі лишається:
    // саме тому воно в продукті головне.
    const noTelegram = { ...USER, username: null };
    expect(telegramHandle(noTelegram)).toBeNull();
    expect(platformHandle(noTelegram)).toBe("@karas_portal");

    // І навпаки: імені на платформі ще немає, а Telegram-хендл уже є.
    const noPlatform = { ...USER, platformUsername: null };
    expect(platformHandle(noPlatform)).toBeNull();
    expect(telegramHandle(noPlatform)).toBe("@karas");
  });

  it("дата приєднання — без часу, і в обох формах запису", () => {
    // Час у рядку «з нами з …» — шум, і він робить рядок довшим за одну лінію.
    expect(joinedLine(USER)).toBe("З нами з 18.09.2026");
    // В `users.created_at` трапляється й ISO: на живому екрані такий рядок
    // показувався сирим — `2026-06-23T07:36:31.070Z` замість дати.
    expect(joinedLine({ ...USER, createdAt: "2026-06-23T07:36:31.070Z" })).toBe(
      "З нами з 23.06.2026",
    );
    expect(joinedLine({ id: 1 })).toBeNull();
  });

  it("літера аватара не буває порожньою", () => {
    expect(avatarInitial(USER)).toBe("С");
    // Порожнє коло нічого не читає — краще знак питання, ніж нічого.
    expect(avatarInitial({ id: 1 })).toBe("?");
    expect(avatarInitial(null)).toBe("?");
  });

  it("без профілю нічого не падає й не вигадує значень", () => {
    expect(telegramName(null)).toBeNull();
    expect(telegramHandle(null)).toBeNull();
    expect(platformHandle(null)).toBeNull();
    expect(joinedLine(null)).toBeNull();
  });

  it("розкладок рівно дві, і друга — інший клас на тому самому вузлі", () => {
    expect(ACCOUNT_LAYOUT_OPTIONS.map((option) => option.key)).toEqual(["portrait", "horizontal"]);
    // Спільна основа — той самий кирпичик: друга розкладка додає модифікатор, а
    // не замінює базу (інакше вона б відкріпилась від меню).
    expect(accountCardsClass("portrait")).toBe("wb-menu-account");
    expect(accountCardsClass("horizontal")).toBe("wb-menu-account wb-menu-account--rows");
    // Знаки різні: однакові не сказали б, чим варіанти різняться.
    const icons = ACCOUNT_LAYOUT_OPTIONS.map((option) => option.icon);
    expect(new Set(icons).size).toBe(icons.length);
    for (const option of ACCOUNT_LAYOUT_OPTIONS) expect(option.label, option.key).toBeTruthy();
  });
});
