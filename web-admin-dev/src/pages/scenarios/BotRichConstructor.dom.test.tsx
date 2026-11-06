// @vitest-environment jsdom
/**
 * Перемикач «Річ-повідомлення» в конструкторі бота.
 *
 * Перевіряємо не розмітку заради розмітки: чекбокс — спільний кирпичик
 * `.wb-check`, а значення пишеться рядком `"true"`/`"false"`, бо саме в такому
 * вигляді його читає бот. Помилка тут тихо вимикає річ-повідомлення у
 * сценарії, і побачити її можна лише в Telegram.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BotRichConstructor } from "./BotRichConstructor";

describe("BotRichConstructor", () => {
  it("малює перемикач спільним кирпичиком і вмикає річ-повідомлення", async () => {
    const updateField = vi.fn();
    render(<BotRichConstructor fields={{ rich_message: "false" }} updateField={updateField} />);

    const toggle = screen.getByRole("checkbox", { name: /rich message/i }) as HTMLInputElement;
    expect(toggle.classList.contains("wb-check")).toBe(true);
    expect(toggle.checked).toBe(false);

    await userEvent.click(toggle);
    expect(updateField).toHaveBeenCalledWith("rich_message", "true");
  });

  it("показує увімкнений стан і вимикає його", async () => {
    const updateField = vi.fn();
    render(<BotRichConstructor fields={{ rich_message: "1" }} updateField={updateField} />);

    const toggle = screen.getByRole("checkbox", { name: /rich message/i }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    await userEvent.click(toggle);
    expect(updateField).toHaveBeenCalledWith("rich_message", "false");
  });

  it("показує наявні блоки rich_data і перемикається в JSON", async () => {
    const updateField = vi.fn();
    const blocks = JSON.stringify([
      { type: "text", text: "Перший блок" },
      { type: "image", url: "https://example.test/a.png" },
    ]);
    render(
      <BotRichConstructor
        fields={{ rich_message: "false", rich_data: blocks }}
        updateField={updateField}
      />,
    );

    /* Візуальний режим показує тип і текст блока — саме те, що людина шукає
       очима, коли блоків багато. */
    expect(screen.getByText("text")).toBeTruthy();
    expect(screen.getByText("Перший блок")).toBeTruthy();
    expect(screen.getByText("image")).toBeTruthy();

    await userEvent.click(screen.getAllByRole("button", { name: "JSON" })[0]);
    const boxes = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    const editor = boxes[boxes.length - 1];
    expect(JSON.parse(editor.value)).toHaveLength(2);

    /* Валідний масив блоків їде назовні, зламаний JSON — ні: інакше сценарій
       зберігся б із синтаксичною помилкою. */
    fireEvent.change(editor, { target: { value: '[{"type":"text"}]' } });
    expect(updateField).toHaveBeenCalledWith("rich_data", '[{"type":"text"}]');
    updateField.mockClear();
    fireEvent.change(editor, { target: { value: "{" } });
    expect(updateField).not.toHaveBeenCalledWith("rich_data", "{");

    await userEvent.click(screen.getAllByRole("button", { name: "Візуально" })[0]);
    expect(screen.getByText("Перший блок")).toBeTruthy();
  });

  it("довантажує форматовані поля підписів", async () => {
    render(<BotRichConstructor fields={{}} updateField={vi.fn()} />);
    expect(await screen.findByText("Caption Top (форматований)")).toBeTruthy();
    expect(screen.getByText("Caption Mid (форматований)")).toBeTruthy();
    expect(screen.getByText("Caption Bot (форматований)")).toBeTruthy();
  });
});
