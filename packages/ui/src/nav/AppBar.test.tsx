/**
 * Тести глобального хедера.
 *
 * Хедер має один рядок і рівно два складники: крохи зліва й гамбургер справа.
 * Дій сторінки (поділитись, обране) в ньому немає — вони сховані, поки їм не
 * знайдеться місце поза хедером.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppBar, AppBarView } from "./AppBar";
import { EMPTY_CHROME, mergeChrome, ScreenChromeContext, type ScreenChrome } from "./screen-chrome";

const ACTIONS = {};

function render(
  chrome: ScreenChrome,
  extra: { onMenu?: () => void; onNavigate?: (href: string) => void; menuOpen?: boolean } = {},
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
  it("показує назву сторінки крохами й не дублює бренд", () => {
    const html = render({ ...EMPTY_CHROME, title: "Нотатки" });

    // Ім'я продукту стоїть у рідній шапці Telegram — у хедері його більше немає.
    expect(html).not.toContain("ПАЛЯНИЦЯ");
    expect(html).not.toContain("wb-appbar__brand");
    expect(html).toContain('class="wb-appbar__trail"');
    expect(html).toContain("Нотатки");
    // Жодного окремого hero-стану: шлях у хедері — на кожному екрані.
    expect(html).not.toContain("wb-appbar--hero");
    // Підпису «платформа для своїх» більше немає.
    expect(html).not.toContain("ПЛАТФОРМА");
    expect(html).not.toContain("ДЛЯ СВОЇХ");
  });

  it("тримає весь шлях одним рядком, а розділ — перед сторінкою", () => {
    const html = render({
      ...EMPTY_CHROME,
      title: "Співставити",
      ancestors: [{ label: "Аналіз людей і подій", href: "/analysis" }],
    });

    expect(html.indexOf("Аналіз людей і подій")).toBeLessThan(html.indexOf("Співставити"));
    expect(html).toContain("wb-appbar__crumb--current");
    expect(html).toContain("wb-appbar__sep");
    // Без `onNavigate` (тест без каркаса) розділ — підпис, а не мертве посилання.
    expect(html).not.toContain("wb-appbar__crumb--link");
  });

  it("з `onNavigate` батьківський рівень стає посиланням", () => {
    const html = render(
      {
        ...EMPTY_CHROME,
        title: "Співставити",
        ancestors: [{ label: "Аналіз", href: "/analysis" }],
      },
      { onNavigate: () => undefined },
    );

    expect(html).toContain(`href="/analysis"`);
    expect(html).toContain("wb-appbar__crumb--link");
  });

  it("⛔ «Назад» і теми в хедері більше немає", () => {
    const html = render({ ...EMPTY_CHROME, title: "Нотатки" });

    expect(html).not.toContain('aria-label="Назад"');
    expect(html).not.toContain('aria-label="Тема"');
  });

  it("меню відкриває гамбургер, а не текстова кнопка «МЕНЮ»", () => {
    const html = render(EMPTY_CHROME, { onMenu: () => undefined });

    expect(html).not.toContain("МЕНЮ");
    expect(html).toContain('class="wb-menubtn"');
    expect(html).toContain('aria-label="Меню"');
    expect(html).not.toContain('aria-label="Меню платформи"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("відкрите меню каже `aria-expanded=true`", () => {
    const html = render(EMPTY_CHROME, { onMenu: () => undefined, menuOpen: true });

    expect(html).toContain('aria-expanded="true"');
  });

  it("екран із посиланням і серцем малює в хедері лише крохи й гамбургер", () => {
    const html = render(WITH_ALL, { onMenu: () => undefined });

    expect(html).toContain('aria-label="Меню"');
    expect(html).not.toContain('aria-label="Поділитись"');
    expect(html).not.toContain('aria-label="Додати в обране"');
    // Меню сторінки більше не малюється в хедері: там лише глобальне меню.
    expect(html).not.toContain('aria-label="Меню сторінки"');
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
