/**
 * Розділ «Платформа» — сторож того, що все про себе стоїть **в одній** картці.
 *
 * Раніше тут були дві: «Ім'я на платформі» й «Дані акаунта». Кожна окремо
 * виглядала правильно, а разом вони ділили один факт навпіл — людина читала
 * «ось ім'я» і «ось іще щось про мене» там, де йдеться про те саме. Тест тримає
 * те, що ламається мовчки: кількість карток (друга завелась би поверненням
 * `plain`), заголовок (без нього картка знову безіменна), те, що дані акаунта
 * нікуди не зникли, і — головне — **коли показуються перемикачі полів**:
 * закритий профіль не мусить показувати шість перемикачів, які ні на що не
 * впливають.
 *
 * @module web-platform-dev/src/pages/AccountPlatformSection.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_OPEN_FIELDS, PUBLIC_PROFILE_FIELDS, type UserProfileData } from "@wwwuabot/shared";
import { AccountPlatformSection } from "./AccountPlatformSection";

const USER: UserProfileData = {
  id: 42,
  platformUsername: "karas",
  role: "user",
  tariff: "free",
  status: "active",
};

const noop = async (): Promise<null> => null;

const render = (user: UserProfileData = USER): string =>
  renderToStaticMarkup(
    <AccountPlatformSection
      user={user}
      onChangeUsername={noop}
      onChangeAbout={noop}
      onChangeVisibility={noop}
    />,
  );

/** Скільки перемикачів у розділі: головний плюс поля, коли профіль відкрито. */
const switches = (html: string): number => html.match(/role="switch"/g)?.length ?? 0;

describe("AccountPlatformSection", () => {
  it("тримає ім'я й дані акаунта в одній картці", () => {
    const html = render();

    expect(html.match(/class="wb-profile"/g)).toHaveLength(1);
    expect(html).toContain("Дані на платформі");
    // Обидві половини — в тій самій картці: ім'я (`#karas`) і поля акаунта.
    expect(html).toContain("#karas");
    expect(html).toContain("Роль");
    expect(html).toContain("Тариф");
    expect(html.indexOf("wb-handle-head")).toBeLessThan(html.indexOf("wb-profile-fields"));
  });

  it("не дає підспискам власних карток", () => {
    const html = render();

    // `plain` у блоці імені: картку дає розділ, тож другої рамки не бути.
    expect(html).not.toContain("wb-profile--handle");
    expect(html).not.toContain("Ім'я на платформі</h3>");
    // Заголовок у картці рівно один — інакше вона знову ділиться навпіл.
    expect(html.match(/class="wb-profile-title"/g)).toHaveLength(1);
  });

  it("не додає слів над карткою і в ній", () => {
    // Розділ говорить підписами полів: і рядок про майбутнє фото, і порада
    // «так вас бачать інші» були текстом ні про що — перший обіцяв те, чого ще
    // немає, друга повторювала підпис поля. Перевіряється розмітка, бо саме
    // такий текст повертається найлегше — він нічого не ламає.
    const html = render();

    expect(html).not.toContain("Своє фото можна буде додати");
    expect(html).not.toContain("Так вас бачать інші");
    expect(html).not.toContain("wb-profile-note");
    expect(html).not.toContain("wb-handle-hint");
    // А фото, яке є, нічого не замовчує: круг показує саме його.
    expect(render({ ...USER, photoUrl: "https://cdn.example/photo.jpg" })).toContain(
      '<img src="https://cdn.example/photo.jpg"',
    );
  });

  it("«Про себе» — у тій самій картці, між іменем і полями", () => {
    const html = render({ ...USER, about: "Люблю гори" });

    expect(html).toContain("Про себе");
    expect(html).toContain("Люблю гори");
    expect(html.indexOf("wb-handle-head")).toBeLessThan(html.indexOf("wb-about"));
    expect(html.indexOf("wb-about")).toBeLessThan(html.indexOf("wb-profile-fields"));
  });

  it("«Про себе» показує порожнечу словом, а не порожнім місцем", () => {
    expect(render()).toContain("Ще не заповнено");
  });

  it("⛔ закритий профіль не показує перемикачів полів", () => {
    // Шість перемикачів, які зараз ні на що не впливають, змушували б
    // здогадуватись, що спершу треба ввімкнути головний.
    const html = render({ ...USER, isPublic: false, openFields: [] });

    expect(switches(html)).toBe(1);
    expect(html).toContain("Публічний профіль");
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
