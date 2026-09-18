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

  it("дата приєднання — без часу", () => {
    // Час у рядку «з нами з …» — шум, і він робить рядок довшим за одну лінію.
    expect(joinedLine(USER)).toBe("З нами з 18.09.2026");
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
});
