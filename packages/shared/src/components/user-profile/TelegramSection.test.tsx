/**
 * Список «Дані від Telegram» — сторож трьох рішень, які ламаються мовчки.
 *
 * Перше: поля перебираються з payload, а не виписані в розмітці, тож **нове**
 * поле Telegram мусить з'явитись саме, зі своїм (неперекладеним) ім'ям —
 * інакше профіль тихо перестає показувати те, що Telegram уже віддає.
 *
 * Друге: те, що вже стоїть у шапці (фото, ім'я, хендл), у списку **не**
 * повторюється — інакше один факт має два місця на одному екрані.
 *
 * Третє: нашого дампу тут немає. Дані сеансу й сирий JSON стояли для
 * відловлювання багів; повернути їх — значить знову показати людині те, що
 * читають у логах.
 *
 * @module packages/shared/src/components/user-profile/TelegramSection.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TelegramSection } from "./TelegramSection";
import { TELEGRAM_HEAD_KEYS } from "./account";
import type { UserProfileData } from "./types";

const USER: UserProfileData = {
  id: 42,
  telegram: {
    id: 372567448,
    first_name: "Сергій",
    last_name: "Дискант",
    username: "DiskantSergiy",
    language_code: "uk",
    photo_url: "https://t.me/i/userpic/320/karas.jpg",
    unknown_future_field: "нове",
  },
};

describe("TelegramSection", () => {
  it("показує невідоме поле, а не ховає його", () => {
    const html = renderToStaticMarkup(<TelegramSection user={USER} />);

    expect(html).toContain("unknown_future_field");
    expect(html).toContain("Мова інтерфейсу");
  });

  it("не повторює те, що вже стоїть у шапці акаунта", () => {
    const html = renderToStaticMarkup(<TelegramSection user={USER} omit={TELEGRAM_HEAD_KEYS} />);

    expect(html).not.toContain("Telegram-хендл");
    expect(html).not.toContain("Прізвище");
    expect(html).not.toContain("DiskantSergiy");
    // Решта payload лишається: обрізати треба повтор, а не дані.
    expect(html).toContain("372567448");
    expect(html).toContain("Мова інтерфейсу");
    expect(html).toContain("unknown_future_field");
  });

  it("порожнє значення показує `...`, а не тире", () => {
    // Поле є, значення немає: тире читалось би як «такого поля немає».
    const html = renderToStaticMarkup(
      <TelegramSection user={{ ...USER, telegram: { id: 372567448, username: "" } }} />,
    );

    expect(html).toContain("Telegram ID");
    expect(html).toContain("...");
    expect(html).not.toContain("—");
  });

  it("не показує ні сирого JSON, ні даних сеансу", () => {
    // Рядок `users` та відповідь API більше не несуть цих полів; якщо вони
    // колись повернуться в payload — список їх не покаже.
    const user = {
      ...USER,
      telegramSession: { chat_type: "private", start_param: "mydate" },
    } as UserProfileData;
    const html = renderToStaticMarkup(<TelegramSection user={user} />);

    expect(html).not.toContain("Показати сирий JSON");
    expect(html).not.toContain("Дані сеансу");
    expect(html).not.toContain("private");
  });
});
