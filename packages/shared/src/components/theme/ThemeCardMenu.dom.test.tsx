// @vitest-environment jsdom
/**
 * DOM-сторож меню дій картки: **що станеться, коли людина до нього доторкнеться**.
 *
 * Це перший тест у проєкті, що працює з браузером, і не випадково: меню дій —
 * річ, якої **неможливо перевірити серверним рендером**. `renderToStaticMarkup`
 * ніколи не виконає `useEffect` і не віддасть дотику, тож «меню закривається
 * поза», «Escape закриває» і «вибір пункту викликає дію» лишалися неперевіреними
 * саме там, де помилка коштує найдорожче — у схованому кутку картки.
 *
 * Оточення вмикається **лише для цього файлу** (`@vitest-environment jsdom`):
 * решта 1857 тестів живуть у `node`, де `document` немає, і код свідомо має
 * охоронці `typeof document === "undefined"`.
 *
 * @module packages/shared/src/components/theme/ThemeCardMenu.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeCard } from "./ThemeCard";

const NIGHT = { bg: "#0b0b0f", text: "#f2f3f7", accent: "#7aa2ff" };
const ACTIONS = [
  { key: "edit", label: "Змінити", icon: "edit" as const },
  { key: "remove", label: "Прибрати", icon: "trash" as const, danger: true },
];

/** Меню відкрите — інакше наступна дія перевіряла б порожнечу. */
async function openMenu(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: /дії теми/i }));
}

describe("меню дій картки — під дотиком", () => {
  it("дотик до «···» відкриває список пунктів", async () => {
    render(
      <ThemeCard
        name="Моя"
        colors={NIGHT}
        font=""
        onApply={() => undefined}
        actions={ACTIONS}
        onAction={() => undefined}
      />,
    );

    expect(screen.queryByRole("menu")).toBeNull();
    await openMenu();
    expect(screen.getByRole("menu")).not.toBeNull();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });

  it("⛔ дотик поза закриває меню", async () => {
    render(
      <ThemeCard
        name="Моя"
        colors={NIGHT}
        font=""
        onApply={() => undefined}
        actions={ACTIONS}
        onAction={() => undefined}
      />,
    );

    await openMenu();
    await userEvent.click(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("⛔ Escape закриває меню", async () => {
    render(
      <ThemeCard
        name="Моя"
        colors={NIGHT}
        font=""
        onApply={() => undefined}
        actions={ACTIONS}
        onAction={() => undefined}
      />,
    );

    await openMenu();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("⛔ вибір пункту викликає дію й закриває меню", async () => {
    const onAction = vi.fn();
    render(
      <ThemeCard
        name="Моя"
        colors={NIGHT}
        font=""
        onApply={() => undefined}
        actions={ACTIONS}
        onAction={onAction}
      />,
    );

    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Прибрати" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith("remove");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("⛔ дотик до «···» не застосовує тему", async () => {
    const onApply = vi.fn();
    render(
      <ThemeCard
        name="Моя"
        colors={NIGHT}
        font=""
        onApply={onApply}
        actions={ACTIONS}
        onAction={() => undefined}
      />,
    );

    await openMenu();
    // Меню й картка — сусідні кнопки, тож відкриття меню не є вибором теми:
    // «···» мусить вести тільки до своїх дій.
    expect(onApply).not.toHaveBeenCalled();
  });

  it("картка без дій не має й кнопки меню", () => {
    render(<ThemeCard name="Чужа" colors={NIGHT} font="" onApply={() => undefined} />);

    expect(screen.queryByRole("button", { name: /дії теми/i })).toBeNull();
  });
});
