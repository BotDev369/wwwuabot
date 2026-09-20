/**
 * Список «Дані від Telegram» — сторож трьох рішень, які ламаються мовчки.
 *
 * Перше: поля перебираються з payload, а не виписані в розмітці, тож **нове**
 * поле Telegram мусить з'явитись саме, зі своїм (неперекладеним) ім'ям —
 * інакше профіль тихо перестає показувати те, що Telegram уже віддає.
 *
 * Друге: у списку стоїть **кожен** ключ payload, і ті, що вже видні в шапці
 * (ім'я, прізвище, хендл, фото), теж. Шапка — впізнавання з першого погляду;
 * список — відповідь на «що про мене відомо». Якщо найпотрібніші поля випадуть
 * саме з нього, їх шукають першими й не знаходять.
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

  it("показує кожен ключ payload, зокрема той, що вже стоїть у шапці", () => {
    const html = renderToStaticMarkup(<TelegramSection user={USER} />);

    // Мітку «Ім'я» шукаємо за значенням: апостроф у розмітці екранований.
    for (const label of ["Прізвище", "Telegram-хендл", "Фото профілю"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("DiskantSergiy");
    expect(html).toContain("Сергій");
  });

  it("не друкує адресу фото: у списку видно, що фото є", () => {
    // Посилання посеред картки не каже людині нічого, а саме фото стоїть у шапці.
    const html = renderToStaticMarkup(<TelegramSection user={USER} />);

    expect(html).not.toContain("https://t.me/i/userpic");
    expect(html).toContain("Фото профілю");
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
