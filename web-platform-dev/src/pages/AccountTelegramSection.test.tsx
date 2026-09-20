/**
 * Розділ «Телеграм» — сторож того, що людина бачить **першим**.
 *
 * Три речі тут ламаються мовчки:
 *   1. шапка: **повне ім'я** (`first_name` + `last_name`) і хендл стоять поруч із
 *      фото — якщо хендл зникає разом зі значенням, рядок читається як поламаний;
 *   2. порожньо — `...`, а не пропуск: тире в чужих даних читалось би як «поля
 *      немає», хоч воно є в payload і просто без значення;
 *   3. джерело даних названо **один раз**: заголовок картки, без другого рядка
 *      над нею — дві згадки про одне читаються як повтор, а не як пояснення;
 *   4. шапка нічого не забирає зі списку: усе, що Telegram віддав, лишається в
 *      переліку нижче — інакше найпотрібніші поля випадають саме з нього.
 *
 * @module web-platform-dev/src/pages/AccountTelegramSection.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { UserProfileData } from "@wwwuabot/shared";
import { AccountTelegramSection } from "./AccountTelegramSection";

const USER: UserProfileData = {
  id: 42,
  telegram: {
    id: 372567448,
    first_name: "Сергій",
    last_name: "Дискант",
    username: "DiskantSergiy",
    language_code: "uk",
  },
};

describe("AccountTelegramSection", () => {
  it("ставить повне ім'я й хендл біля фото", () => {
    const html = renderToStaticMarkup(<AccountTelegramSection user={USER} />);

    expect(html).toContain("wb-account-head-title");
    expect(html).toContain("Сергій Дискант");
    // Позначка `@` — лише в Telegram-юзернейма (AGENTS.md §2).
    expect(html).toContain("@DiskantSergiy");
  });

  it("на порожньому місці ставить `...`, а не лишає рядок без нічого", () => {
    const html = renderToStaticMarkup(
      <AccountTelegramSection user={{ ...USER, telegram: { id: 1, first_name: "" } }} />,
    );

    expect(html).toContain("...");
    expect(html).not.toContain("@");
  });

  it("лишає в списку те, що вже показала шапка", () => {
    const html = renderToStaticMarkup(<AccountTelegramSection user={USER} />);

    // Шапка — не привід викидати поле з переліку: у списку є і хендл, і мова.
    expect(html).toContain("Юзернейм");
    expect(html).toContain("Мова інтерфейсу");
  });

  it("називає джерело даних один раз — заголовком картки", () => {
    const html = renderToStaticMarkup(<AccountTelegramSection user={USER} />);

    // Раніше тут стояли і рядок над карткою, і заголовок у ній — про те саме.
    expect(html).not.toContain("Ці дані дає Telegram");
    expect((html.match(/Дані від Telegram/g) ?? []).length).toBe(1);
    // А картка справді є: повтор прибирали не разом із нею.
    expect(html).toContain("wb-account-head");
  });

  it("не показує ні сирого JSON, ні даних сеансу", () => {
    const html = renderToStaticMarkup(<AccountTelegramSection user={USER} />);

    expect(html).not.toContain("Показати сирий JSON");
    expect(html).not.toContain("Дані сеансу");
  });
});
