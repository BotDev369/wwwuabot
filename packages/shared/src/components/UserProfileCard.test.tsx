/**
 * Картка користувача для адмінки: те, що потрібно тому, хто дивиться на чужого.
 *
 * Тести фіксують рішення, які легко зламати мовчки: ім'я на платформі стоїть
 * **першим** і **не редагується** (чуже ім'я не переписують випадково); чужі
 * дані Telegram показуються **всі**, зокрема невідомі нам поля; і один факт не
 * дублюється в двох розділах — ані Telegram-поля, ані фото (аватар бере те
 * саме фото з двох полів, а не показує літеру при наявному фото).
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UserProfileCard } from "./UserProfileCard";
import type { UserProfileData } from "./user-profile/types";

const USER: UserProfileData = {
  id: 777,
  firstName: "Оля",
  lastName: "Коваль",
  username: "olya_tg",
  platformUsername: "olya",
  language: "uk",
  role: "user",
  tariff: "free",
  status: "active",
  telegram: {
    id: 777,
    first_name: "Оля",
    is_premium: true,
    photo_url: "https://t.me/i/userpic/320/olya.jpg",
    unknown_future_field: "нове",
  },
  telegramSession: { chat_type: "private", start_param: "mydate" },
};

describe("UserProfileCard", () => {
  it("ставить ім'я на платформі найпершим блоком", () => {
    const html = renderToStaticMarkup(<UserProfileCard user={USER} />);

    // Текст заповнювача екранує апостроф, тому перевіряємо клас кирпичика
    expect(html).toContain("wb-handle-label");
    expect(html).toContain("на платформі");
    expect(html).toContain("#olya");
    // Перший блок — саме він, а не Telegram-ім'я
    expect(html.indexOf("wb-handle-label")).toBeLessThan(html.indexOf("Оля Коваль"));
  });

  it("не редагує чуже ім'я й не радить тому, хто на нього дивиться", () => {
    // Кнопка «Змінити» тут була б кнопкою, що переписує чуже ім'я, а порада
    // «так вас бачать інші» зверталась би не до того, кого видно в рядку.
    const html = renderToStaticMarkup(<UserProfileCard user={USER} />);
    expect(html).toContain("#olya");
    expect(html).not.toContain("Змінити");
    expect(html).not.toContain("Так вас бачать інші");
  });

  it("показує аватар із двох полів: своє фото платформи, далі фото Telegram", () => {
    // Фото лежить в одному з двох полів — і показувати літеру при наявному фото
    // означало б, що картка не бачить того, що вже є.
    const telegramPhoto = renderToStaticMarkup(<UserProfileCard user={USER} />);
    expect(telegramPhoto).toContain("https://t.me/i/userpic/320/olya.jpg");

    const ownPhoto = renderToStaticMarkup(
      <UserProfileCard user={{ ...USER, photoUrl: "https://cdn.example/olya.png" }} />,
    );
    expect(ownPhoto).toContain("https://cdn.example/olya.png");
  });

  it("показує всі поля, які віддав Telegram, зокрема невідомі нам", () => {
    const html = renderToStaticMarkup(<UserProfileCard user={USER} />);

    expect(html).toContain("Дані від Telegram");
    expect(html).toContain("Telegram Premium");
    expect(html).toContain("Так"); // is_premium
    expect(html).toContain("unknown_future_field"); // нове поле Telegram — видно
    expect(html).toContain("нове");
  });

  it("показує дані сеансу Mini App окремим, згорнутим блоком", () => {
    const html = renderToStaticMarkup(<UserProfileCard user={USER} />);

    expect(html).toContain("Дані сеансу Mini App");
    expect(html).toContain("Тип чату");
    expect(html).toContain("private");
  });

  it("показує дані системи: роль, тариф, статус", () => {
    const html = renderToStaticMarkup(<UserProfileCard user={USER} />);

    expect(html).toContain("Дані системи");
    expect(html).toContain("Роль");
    expect(html).toContain("Тариф");
    expect(html).toContain("Статус");
  });

  it("не дублює Telegram-поля, коли payload уже є", () => {
    const withPayload = renderToStaticMarkup(<UserProfileCard user={USER} />);
    const withoutPayload = renderToStaticMarkup(
      <UserProfileCard user={{ ...USER, telegram: null, telegramSession: null }} />,
    );

    expect(withPayload.match(/Дані від Telegram/g)).toHaveLength(1);
    // «Прізвище» є лише серед колонок рядка `users` — отже, другої копії немає
    expect(withPayload).not.toContain("Прізвище");
    expect(withoutPayload).toContain("Прізвище");
  });

  it("показує Telegram-поля з рядка, коли payload ще не збережено", () => {
    const html = renderToStaticMarkup(
      <UserProfileCard user={{ ...USER, telegram: null, telegramSession: null }} />,
    );

    expect(html).not.toContain("Дані від Telegram");
    expect(html).toContain("Telegram-хендл");
    expect(html).toContain("@olya_tg");
  });

  it("розрізняє завантаження й помилку", () => {
    expect(renderToStaticMarkup(<UserProfileCard user={USER} loading />)).toContain(
      "Завантаження даних",
    );
    expect(renderToStaticMarkup(<UserProfileCard user={USER} error="401" />)).toContain("Помилка");
  });
});
