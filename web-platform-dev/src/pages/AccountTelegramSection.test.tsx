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
 * Публічність живе тут **окремою карткою під даними Telegram**, і поля під
 * головним перемикачем показуються лише тоді, коли профіль відкрито: шість
 * перемикачів, які зараз ні на що не впливають, змушували б здогадуватись, що
 * спершу треба ввімкнути перший.
 *
 * @module web-platform-dev/src/pages/AccountTelegramSection.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_OPEN_FIELDS, PUBLIC_PROFILE_FIELDS, type UserProfileData } from "@wwwuabot/shared";
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

const noop = async (): Promise<null> => null;

const render = (user: UserProfileData = USER): string =>
  renderToStaticMarkup(<AccountTelegramSection user={user} onChangeVisibility={noop} />);

/** Скільки перемикачів у розділі: головний плюс поля, коли профіль відкрито. */
const switches = (html: string): number => html.match(/role="switch"/g)?.length ?? 0;

describe("AccountTelegramSection", () => {
  it("ставить повне ім'я й хендл біля фото", () => {
    const html = render();

    expect(html).toContain("wb-account-head-title");
    expect(html).toContain("Сергій Дискант");
    // Позначка `@` — лише в Telegram-юзернейма (AGENTS.md §2).
    expect(html).toContain("@DiskantSergiy");
  });

  it("на порожньому місці ставить `...`, а не лишає рядок без нічого", () => {
    const html = render({ ...USER, telegram: { id: 1, first_name: "" } });

    expect(html).toContain("...");
    expect(html).not.toContain("@");
  });

  it("лишає в списку те, що вже показала шапка", () => {
    const html = render();

    // Шапка — не привід викидати поле з переліку: у списку є і хендл, і мова.
    expect(html).toContain("Юзернейм");
    expect(html).toContain("Мова інтерфейсу");
  });

  it("називає джерело даних один раз — заголовком картки", () => {
    const html = render();

    // Раніше тут стояли і рядок над карткою, і заголовок у ній — про те саме.
    expect(html).not.toContain("Ці дані дає Telegram");
    expect((html.match(/Дані від Telegram/g) ?? []).length).toBe(1);
    // А картка справді є: повтор прибирали не разом із нею.
    expect(html).toContain("wb-account-head");
  });

  it("не показує ні сирого JSON, ні даних сеансу", () => {
    const html = render();

    expect(html).not.toContain("Показати сирий JSON");
    expect(html).not.toContain("Дані сеансу");
  });

  it("ставить публічність окремою карткою під даними Telegram", () => {
    const html = render();

    // Дві картки, і публічність — друга: під даними, а не всередині них.
    expect(html.match(/class="wb-profile"/g)).toHaveLength(2);
    expect(html.indexOf("Дані від Telegram")).toBeLessThan(html.indexOf("Публічність"));
    // Заголовок картки й головний перемикач — різні речі: перший називає блок,
    // другий — сам стан.
    expect(html).toContain("Публічний профіль");
  });

  it("⛔ закритий профіль не показує перемикачів полів", () => {
    const html = render({ ...USER, isPublic: false, openFields: [] });

    expect(switches(html)).toBe(1);
    expect(html).not.toContain("З нами з");
  });

  it("відкритий профіль показує всі поля, і типові — увімкненими", () => {
    // Коли набір не збережено, діє типовий: ім'я, фото й «Про себе» відкриті.
    const html = render({ ...USER, isPublic: true });

    expect(switches(html)).toBe(1 + PUBLIC_PROFILE_FIELDS.length);
    expect(html.match(/wb-switch--on/g)).toHaveLength(1 + DEFAULT_OPEN_FIELDS.length);
  });

  it("порожній набір лишається порожнім — це вибір, а не «ще не вирішували»", () => {
    const html = render({ ...USER, isPublic: true, openFields: [] });

    expect(switches(html)).toBe(1 + PUBLIC_PROFILE_FIELDS.length);
    expect(html.match(/wb-switch--on/g)).toHaveLength(1);
  });
});
