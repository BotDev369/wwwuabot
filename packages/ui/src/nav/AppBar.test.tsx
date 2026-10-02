/**
 * Тести глобального хедера.
 *
 * Перевіряємо те, що ламається мовчки: набір знаків. Екран мовчить — хедер
 * показує порожню кнопку, яка нічого не робить, а це гірше, ніж нічого.
 * Тому тут явно: що є, коли екран сказав, і чого немає, коли не сказав.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppBarView } from "./AppBar";
import { EMPTY_CHROME, mergeChrome, type ScreenChrome } from "./screen-chrome";

function render(chrome: ScreenChrome): string {
  return renderToStaticMarkup(<AppBarView chrome={chrome} />);
}

const WITH_ALL: ScreenChrome = {
  ...EMPTY_CHROME,
  title: "Галерея",
  menu: () => undefined,
  shareUrl: "/gallery",
  favorite: { kind: "page", targetId: 7 },
};

describe("хедер застосунку", () => {
  it("⛔ порожній екран не малює зайвих кнопок — тільки назва", () => {
    const html = render({ ...EMPTY_CHROME, title: "Нотатки" });

    expect(html).toContain("Нотатки");
    expect(html).not.toContain("Поділитись");
    expect(html).not.toContain("Меню сторінки");
    // Тема — єдиний знак, який показується всюди, де тільки можна.
    expect(html).toContain('aria-label="Тема"');
  });

  it("екран із меню, посиланням і серцем показує всі чотири знаки", () => {
    const html = render(WITH_ALL);

    expect(html).toContain('aria-label="Меню сторінки"');
    expect(html).toContain('aria-label="Поділитись"');
    expect(html).toContain('aria-label="Додати в обране"');
    expect(html).toContain('aria-label="Тема"');
  });

  it("⛔ палітра теми є на кожному екрані — навіть там, де меню профілю", () => {
    // Тема в хедері, а не пунктом меню: два входи в одну дію означають, що
    // за один із них забудуть.
    const html = render({ ...EMPTY_CHROME, title: "Профіль" });

    expect(html).toContain('aria-label="Тема"');
  });

  it("знак серця лишається читабельним без підпису", () => {
    // Підпис каже, що кнопка робить, а не «серце»: знак без тексту на
    // телефоні не сказав би, чи це вже обране.
    const html = render(WITH_ALL);

    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('title="Додати в обране"');
  });
});

describe("злиття оголошень екрана", () => {
  it("екран, який сказав лише серце, не зносить назву й посилання", () => {
    const merged = mergeChrome(WITH_ALL, { favorite: { kind: "user", targetId: 3 } });

    expect(merged.title).toBe("Галерея");
    expect(merged.shareUrl).toBe("/gallery");
    expect(merged.favorite).toEqual({ kind: "user", targetId: 3 });
  });

  it("⛔ повторне те саме оголошення не змінює стан — інакше рендер ганяє по колу", () => {
    const merged = mergeChrome(WITH_ALL, { title: "Галерея" });

    expect(merged).toBe(WITH_ALL);
  });

  it("null прибирає дію, undefined її не чіпає", () => {
    const withoutShare = mergeChrome(WITH_ALL, { shareUrl: null });
    expect(withoutShare.shareUrl).toBeNull();

    const untouched = mergeChrome(withoutShare, { title: undefined });
    expect(untouched).toBe(withoutShare);
  });

  it("⬜ другий екран не успадковує дії попереднього — його серце не лишилося в «Обраному»", () => {
    // Різниця між екранами видна саме тут: серце сторінки не повинно
    // переїхати в наступний екран, який про себе нічого не сказав.
    const afterPage = mergeChrome(EMPTY_CHROME, {
      title: "Галерея",
      favorite: { kind: "page", targetId: 7 },
    });

    const afterFavorites = mergeChrome(afterPage, { ...EMPTY_CHROME, title: "Обране" });
    expect(afterFavorites).toEqual({ ...EMPTY_CHROME, title: "Обране" });
  });
});
