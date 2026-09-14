/**
 * Спільна картка профілю — той самий екран для TWA й адмінки.
 *
 * Тести фіксують рішення, які легко зламати мовчки: ім'я на платформі стоїть
 * **першим** і редагується лише там, де є обробник; показуються **всі** поля,
 * які віддав Telegram (включно з тими, яких ми не знаємо); і один факт не
 * дублюється в двох розділах.
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
  telegram: { id: 777, first_name: "Оля", is_premium: true, unknown_future_field: "нове" },
  telegramSession: { chat_type: "private", start_param: "mydate" },
};

describe("UserProfileCard", () => {
  it("ставить ім'я на платформі найпершим блоком", () => {
    const html = renderToStaticMarkup(<UserProfileCard user={USER} />);

    // Текст заповнювача екранує апостроф, тому перевіряємо клас кирпичика
    expect(html).toContain("wb-handle-label");
    expect(html).toContain("на платформі");
    expect(html).toContain("@olya");
    // Перший блок — саме він, а не Telegram-ім'я
    expect(html.indexOf("wb-handle-label")).toBeLessThan(html.indexOf("Оля Коваль"));
  });

  it("редагує ім'я лише тоді, коли є обробник", () => {
    const readOnly = renderToStaticMarkup(<UserProfileCard user={USER} />);
    expect(readOnly).toContain("@olya");
    expect(readOnly).not.toContain("Змінити");

    const editable = renderToStaticMarkup(
      <UserProfileCard user={USER} onChangeUsername={async () => null} />,
    );
    expect(editable).toContain("Змінити");
  });

  it("без імені чесно каже «ще не задано» і пропонує його обрати", () => {
    const html = renderToStaticMarkup(
      <UserProfileCard
        user={{ ...USER, platformUsername: null }}
        onChangeUsername={async () => null}
      />,
    );

    expect(html).toContain("ще не задано");
    expect(html).toContain("Обрати");
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

  it("в адмінці не дублює Telegram-поля, коли payload уже є", () => {
    const withPayload = renderToStaticMarkup(<UserProfileCard user={USER} variant="admin" />);
    const withoutPayload = renderToStaticMarkup(
      <UserProfileCard user={{ ...USER, telegram: null, telegramSession: null }} variant="admin" />,
    );

    expect(withPayload.match(/Дані від Telegram/g)).toHaveLength(1);
    // «Прізвище» є лише серед колонок рядка `users` — отже, другої копії немає
    expect(withPayload).not.toContain("Прізвище");
    expect(withoutPayload).toContain("Прізвище");
  });

  it("в адмінці показує Telegram-поля з рядка, коли payload ще не збережено", () => {
    const html = renderToStaticMarkup(
      <UserProfileCard user={{ ...USER, telegram: null, telegramSession: null }} variant="admin" />,
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
