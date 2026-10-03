// @vitest-environment jsdom
/**
 * DOM-сторож вибору теми: **те, що не стежить за цим, ламається в руках.**
 *
 * Цей файл існує через одну конкретну помилку: `useUserColors` мав ефект
 * `useEffect(() => () => applyColors(readStoredColors()), [])`, тобто на
 * виході відкочував вибір назад із пам'яті. Людина обирала палітру, бачила її
 * живцем, закривала панель — і тема не застосовувалася.
 *
 * **Чому це не ловили 1857 тестів:** вони живуть у `node`, де немає
 * `document`, а ефекти й локальна пам'ять — це майже весь зміст цього хука.
 * Серверний рендер бачить лише «який HTML у картки», а не «що лишиться на
 * екрані, коли панель закриють».
 *
 * @module packages/shared/src/components/theme/useUserColors.dom.test
 */

import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { COLOR_PRESETS } from "../../styles/color-presets";
import { USER_COLORS_KEY } from "../../styles/user-colors";
import { useUserColors } from "./useUserColors";

const WINE = COLOR_PRESETS.find((preset) => preset.id === "wine")!;
const LIME = COLOR_PRESETS.find((preset) => preset.id === "forest")!;

/** Покласти в пам'ять іншу палітру, ніж та, що на екрані. */
function storeForeign(preset: typeof WINE): void {
  localStorage.setItem(
    USER_COLORS_KEY,
    JSON.stringify({ bg: preset.bg, text: preset.text, accent: preset.accent }),
  );
}

function storedColors(): Record<string, string> {
  return JSON.parse(localStorage.getItem(USER_COLORS_KEY) ?? "{}") as Record<string, string>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-colors");
  document.documentElement.removeAttribute("data-colors-mode");
});

describe("вибір кольорів — під дотиком і після закриття", () => {
  it("⛔ закриття панелі не переписує тему, яку щойно обрали", () => {
    const { result, unmount } = renderHook(() => useUserColors());

    act(() => result.current.applyPreset(WINE));
    // У сховищі тепер **інша** палітра (інша вкладка, інший екземпляр хука):
    // рівно той стан, у якому старий ефект-відкат переписував тему, показану
    // людині, на те, що лежить у пам'яті. Відкат — це «вибір зник».
    storeForeign(LIME);
    unmount();

    expect(document.documentElement.style.getPropertyValue("--user-accent")).toBe(WINE.accent);
    expect(document.documentElement.getAttribute("data-colors")).toBe("custom");
  });

  it("вибір одразу потрапляє в пам'ять пристрою", () => {
    const { result } = renderHook(() => useUserColors());

    act(() => result.current.applyPreset(WINE));

    // Без цього кроку тема жила б до перезавантаження сторінки й зникла б разом
    // із вкладкою — а «Застосувати» зник, тож записати її більше нема чим.
    expect(storedColors()).toMatchObject({
      bg: WINE.bg,
      text: WINE.text,
      accent: WINE.accent,
    });
  });

  it("⛔ неповна палітра ніде не записується, і попередня тема лишається", () => {
    const { result } = renderHook(() => useUserColors());

    // Спершу повна палітра (щоб чернетка мала з чого стартувати — сам jsdom
    // не має завантаженого CSS і читав би порожні кольори з екрана), потім
    // людина прибирає одне: далі це вже неповний вибір.
    act(() => result.current.applyPreset(WINE));
    act(() => result.current.setSlot("accent", ""));

    // «Порожніх не буває»: поки бракує кольору, на екрані лишається те,
    // що вже застосовано, а панель називає порожній слот.
    expect(result.current.complete).toBe(false);
    expect(result.current.missing).toEqual(["Акцент"]);
    expect(storedColors().accent).toBe(WINE.accent);
    expect(document.documentElement.style.getPropertyValue("--user-accent")).toBe(WINE.accent);
  });

  it("новий вибір бачить старі збережені кольори", () => {
    // Меню відкривається не порожнім: людина бачить те, що має.
    localStorage.setItem(
      USER_COLORS_KEY,
      JSON.stringify({ bg: WINE.bg, text: WINE.text, accent: WINE.accent }),
    );

    const { result } = renderHook(() => useUserColors());

    expect(result.current.current).toMatchObject({ accent: WINE.accent });
    expect(result.current.complete).toBe(true);
  });
});
