/**
 * Обліковий рядок — один рядок хабу, і саме тому його легко зламати мовчки.
 *
 * Три речі тут не косметичні: **два фото** мусять бути різними (фото платформи
 * не підміняється фото Telegram — інакше людина побачила б чуже як своє),
 * позначки (`#` і `@`) мусять розрізняти акаунти, а порожнеча мусить щось
 * **сказати** — інакше два круги без імен читаються як поламане завантаження.
 *
 * @module packages/shared/src/components/user-profile/AccountRow.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UserAccountRow } from "./AccountRow";
import type { UserProfileData } from "./types";

const TG_PHOTO = "https://t.me/i/userpic/320/karas.jpg";

const USER: UserProfileData = {
  id: 42,
  firstName: "Сергій",
  lastName: "Дискант",
  username: "DiskantSergiy",
  platformUsername: "karas",
  telegram: { first_name: "Сергій", username: "DiskantSergiy", photo_url: TG_PHOTO },
};

const noop = (): void => {};

describe("UserAccountRow", () => {
  it("несе два імені: наше `#` і Telegram `@`", () => {
    const html = renderToStaticMarkup(<UserAccountRow user={USER} onSelect={noop} />);

    expect(html).toContain("#karas");
    expect(html).toContain("@DiskantSergiy");
  });

  it("не підміняє фото платформи фото Telegram", () => {
    const html = renderToStaticMarkup(<UserAccountRow user={USER} onSelect={noop} />);

    // Фото Telegram займає **одне** коло: друге показує літеру. Якби воно
    // потрапило в обидва, круги перестали б означати два різні акаунти.
    expect(html.match(/<img /g) ?? []).toHaveLength(1);
    expect(html).toContain(TG_PHOTO);
    expect(html).toContain("wb-account-initial");

    const own = renderToStaticMarkup(
      <UserAccountRow
        user={{ ...USER, photoUrl: "https://cdn.example/karas.png" }}
        onSelect={noop}
      />,
    );
    expect(own.match(/<img /g) ?? []).toHaveLength(2);
    expect(own).toContain("https://cdn.example/karas.png");
    expect(own).toContain(TG_PHOTO);
  });

  it("без імені на платформі кличе його обрати, а не мовчить", () => {
    const html = renderToStaticMarkup(
      <UserAccountRow user={{ ...USER, platformUsername: null }} onSelect={noop} />,
    );

    // Апостроф у тексті екранується, тож перевіряємо його обома формами.
    expect(html).toMatch(/Обрати ім(&#x27;|')я/);
    // Telegram-інд. лишається другим рядком: людина бачить, під яким хендлом її знають.
    expect(html).toContain("@DiskantSergiy");
  });

  it("поки даних немає — каже причину, а не показує порожній рядок", () => {
    const html = renderToStaticMarkup(
      <UserAccountRow user={null} note="Завантаження…" onSelect={noop} />,
    );

    expect(html).toContain("Акаунт");
    expect(html).toContain("Завантаження…");
  });

  it("рядок — кнопка: дотик діє на всій ширині, а не лише по імені", () => {
    const html = renderToStaticMarkup(<UserAccountRow user={USER} onSelect={noop} />);

    expect(html).toContain('<button type="button" class="wb-account-row"');
  });
});
