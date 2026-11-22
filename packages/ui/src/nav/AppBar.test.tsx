/**
 * Тести глобального хедера.
 *
 * Хедер має два рядки: той самий бренд і «МЕНЮ», під ним — назву поточного
 * екрана. Перевіряємо саме це, а також що дії сторінки (поділитись, обране)
 * не зникають і не дублюють тему.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppBar, AppBarView } from "./AppBar";
import { EMPTY_CHROME, mergeChrome, ScreenChromeContext, type ScreenChrome } from "./screen-chrome";

const ACTIONS = {};

function render(
  chrome: ScreenChrome,
  extra: { onMenu?: () => void; menuOpen?: boolean } = {},
): string {
  return renderToStaticMarkup(<AppBarView chrome={chrome} {...ACTIONS} {...extra} />);
}

const WITH_ALL: ScreenChrome = {
  ...EMPTY_CHROME,
  title: "Галерея",
  menu: () => undefined,
  share: { slug: "gallery" },
  favorite: { kind: "page", targetId: 7 },
};

describe("хедер застосунку", () => {
  it("показує слово бренду й назву сторінки другим рядком", () => {
    const html = render({ ...EMPTY_CHROME, title: "Нотатки" });

    expect(html).toContain("ПАЛЯНИЦЯ");
    expect(html).toContain('class="wb-appbar__trail"');
    expect(html).toContain("Нотатки");
    // Підпису «платформа для своїх» більше немає.
    expect(html).not.toContain("ПЛАТФОРМА");
    expect(html).not.toContain("ДЛЯ СВОЇХ");
  });

  it("у hero-режимі ховає назву, поки великий h1 видно", () => {
    const html = render({ ...EMPTY_CHROME, title: "Hero page", titleMode: "hero" });

    expect(html).toContain("wb-appbar--hero");
    // Поки `h1` видно, хедер однорядковий: жодного стека й жодної плашки.
    expect(html).not.toContain("wb-appbar__trail");
    expect(html).not.toContain("Hero page");
  });

  it("зберігає всі рівні шляху окремими рядками", () => {
    const html = render({
      ...EMPTY_CHROME,
      title: "Співставити",
      ancestors: ["Аналіз людей і подій"],
    });

    expect(html.indexOf("Аналіз людей і подій")).toBeLessThan(html.indexOf("Співставити"));
    expect(html).toContain("wb-appbar__crumb--current");
  });

  it("⛔ «Назад» і теми в хедері більше немає", () => {
    const html = render({ ...EMPTY_CHROME, title: "Нотатки" });

    expect(html).not.toContain('aria-label="Назад"');
    expect(html).not.toContain('aria-label="Тема"');
  });

  it("«МЕНЮ» — текстова кнопка праворуч, а не гамбургер", () => {
    const html = render(EMPTY_CHROME, { onMenu: () => undefined });

    expect(html).toContain(">МЕНЮ</button>");
    expect(html).toContain('aria-label="Меню"');
    expect(html).not.toContain('aria-label="Меню платформи"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("відкрите меню каже `aria-expanded=true`", () => {
    const html = render(EMPTY_CHROME, { onMenu: () => undefined, menuOpen: true });

    expect(html).toContain('aria-expanded="true"');
  });

  it("екран із посиланням і серцем показує обидві дії поруч із «МЕНЮ»", () => {
    const html = render(WITH_ALL, { onMenu: () => undefined });

    expect(html).toContain('aria-label="Поділитись"');
    expect(html).toContain('aria-label="Додати в обране"');
    expect(html).toContain('aria-label="Меню"');
    // Меню сторінки більше не малюється в хедері: там лише глобальне меню.
    expect(html).not.toContain('aria-label="Меню сторінки"');
  });

  it("знак серця лишається читабельним без підпису", () => {
    const html = render(WITH_ALL);

    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('title="Додати в обране"');
  });
});

describe("хедер як частина каркаса", () => {
  it("без провайдера екранів не малює нічого", () => {
    expect(renderToStaticMarkup(<AppBar />)).toBe("");
  });

  it("з провайдером бере стан екрана з контексту", () => {
    const html = renderToStaticMarkup(
      <ScreenChromeContext.Provider
        value={{ chrome: { ...EMPTY_CHROME, title: "Нотатки" }, update: () => undefined }}
      >
        <AppBar onMenu={() => undefined} menuOpen />
      </ScreenChromeContext.Provider>,
    );

    expect(html).toContain("ПАЛЯНИЦЯ");
    expect(html).toContain("Нотатки");
    expect(html).toContain('aria-expanded="true"');
  });
});

describe("злиття оголошень екрана", () => {
  it("екран, який сказав лише серце, не зносить назву й посилання", () => {
    const merged = mergeChrome(WITH_ALL, { favorite: { kind: "user", targetId: 3 } });

    expect(merged.title).toBe("Галерея");
    expect(merged.share).toEqual({ slug: "gallery" });
    expect(merged.favorite).toEqual({ kind: "user", targetId: 3 });
  });

  it("⛔ повторне те саме оголошення не змінює стан — інакше рендер ганяє по колу", () => {
    const merged = mergeChrome(WITH_ALL, { title: "Галерея" });

    expect(merged).toBe(WITH_ALL);
  });

  it("null прибирає дію, undefined її не чіпає", () => {
    const withoutShare = mergeChrome(WITH_ALL, { share: null });
    expect(withoutShare.share).toBeNull();

    const untouched = mergeChrome(withoutShare, { title: undefined });
    expect(untouched).toBe(withoutShare);
  });

  it("⬜ другий екран не успадковує дії попереднього — його серце не лишилося в «Обраному»", () => {
    const afterPage = mergeChrome(EMPTY_CHROME, {
      title: "Галерея",
      favorite: { kind: "page", targetId: 7 },
    });

    const afterFavorites = mergeChrome(afterPage, { ...EMPTY_CHROME, title: "Обране" });
    expect(afterFavorites).toEqual({ ...EMPTY_CHROME, title: "Обране" });
  });
});
