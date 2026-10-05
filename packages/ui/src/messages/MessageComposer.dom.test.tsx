// @vitest-environment jsdom
/**
 * Поле вводу: **фото лишається в руці людини доти, поки вона його не надішлела**.
 *
 * Три рішення, які ламаються вже в руках. Перше — завантаження відбувається
 * **одразу після вибору файлу**, а не разом із надсиланням: надсилання лишається
 * тим самим кроком для тексту й фото, тож одна з двох речей не може випасти з
 * потягнення. Друге — **помилка завантаження не з'їдає текст** і показується
 * біля поля, а не зникає. Третє — фото **прибирається без надсилання** і
 * повертає кнопку прикріплення: людина передумала, і її право не повинно
 * витрачатися на другий файл.
 *
 * @module @wwwuabot/ui/messages/MessageComposer.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageComposer } from "./MessageComposer";

const KEY = "msg/777/abcdef.png";

function photo(name = "photo.png"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

/** Вибрати файл у прихованому полі — так це робить браузер за кнопкою. */
async function chooseFile(file: File): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("поля вибору файлу немає");
  await userEvent.upload(input, file);
}

function attachButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Прикріпити фото" });
}

function sendButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Надіслати" });
}

/** Матчери jest-dom у цьому проєкті не підключені — стан діємо через DOM. */
function disabled(button: HTMLElement): boolean {
  return (button as HTMLButtonElement).disabled;
}

function draftValue(): string {
  return (screen.getByLabelText("Текст повідомлення") as HTMLInputElement).value;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("без оболонки, яка вміє завантажувати файли", () => {
  it("кнопки прикріплення немає — краще відсутня, ніж «є, але мовчить»", () => {
    render(<MessageComposer onSend={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Прикріпити фото" })).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});

describe("текст без фото", () => {
  it("гасне надсилання на порожньому полі, але не ховається", async () => {
    render(<MessageComposer onSend={vi.fn()} />);

    expect(disabled(sendButton())).toBe(true);
    await userEvent.type(screen.getByLabelText("Текст повідомлення"), "привіт");

    expect(disabled(sendButton())).toBe(false);
  });

  it("поле чиститься лише після підтвердження сервера", async () => {
    const onSend = vi.fn().mockResolvedValue(false);
    render(<MessageComposer onSend={onSend} />);

    await userEvent.type(screen.getByLabelText("Текст повідомлення"), "текст");
    await userEvent.click(sendButton());

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("текст", null));
    // Сервер не підтвердив — написане лишається, інакше людина писала б знову.
    expect(draftValue()).toBe("текст");
  });

  it("підтверджене повідомлення прибирає з поля", async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    render(<MessageComposer onSend={onSend} />);

    await userEvent.type(screen.getByLabelText("Текст повідомлення"), "текст");
    await userEvent.click(sendButton());

    await waitFor(() => expect(draftValue()).toBe(""));
  });
});

describe("фото в руках людини", () => {
  it("завантажується одразу після вибору і показується до надсилання", async () => {
    const onAttach = vi.fn().mockResolvedValue({ id: 12, key: KEY });
    render(<MessageComposer onAttach={onAttach} onSend={vi.fn()} />);

    await chooseFile(photo());

    await waitFor(() => expect(onAttach).toHaveBeenCalledOnce());
    const preview = await screen.findByAltText("Прикріплене фото");
    expect(preview.getAttribute("src")).toContain(KEY);
  });

  it("порожній текст із фото — законне повідомлення: надсилання вже активне", async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    render(
      <MessageComposer
        onAttach={vi.fn().mockResolvedValue({ id: 12, key: KEY })}
        onSend={onSend}
      />,
    );

    expect(disabled(sendButton())).toBe(true);
    await chooseFile(photo());

    await waitFor(() => expect(disabled(sendButton())).toBe(false));
    await userEvent.click(sendButton());

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("", 12));
  });

  it("фото йде в повідомлення разом із підписом", async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    render(
      <MessageComposer
        onAttach={vi.fn().mockResolvedValue({ id: 12, key: KEY })}
        onSend={onSend}
      />,
    );

    await chooseFile(photo());
    await waitFor(() => expect(screen.getByAltText("Прикріплене фото")).not.toBeNull());
    await userEvent.type(screen.getByLabelText("Текст повідомлення"), "ось так");
    await userEvent.click(sendButton());

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("ось так", 12));
  });

  it("помилка завантаження не з'їдає текст і лишається біля поля", async () => {
    const onAttach = vi.fn().mockRejectedValue(new Error("Файл завеликий"));
    render(<MessageComposer onAttach={onAttach} onSend={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Текст повідомлення"), "текст");
    await chooseFile(photo());

    expect(await screen.findByText("Файл завеликий")).not.toBeNull();
    expect(draftValue()).toBe("текст");
    // Фото не прикріпилося — у повідомлення піде лише текст, без номера файлу.
    expect(screen.queryByAltText("Прикріплене фото")).toBeNull();
    expect(disabled(attachButton())).toBe(false);
  });

  it("прибрати фото можна без надсилання, і кнопка повертається", async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    render(
      <MessageComposer
        onAttach={vi.fn().mockResolvedValue({ id: 12, key: KEY })}
        onSend={onSend}
      />,
    );

    await chooseFile(photo());
    await waitFor(() => expect(screen.getByAltText("Прикріплене фото")).not.toBeNull());

    await userEvent.click(screen.getByRole("button", { name: "Прибрати фото" }));

    expect(screen.queryByAltText("Прикріплене фото")).toBeNull();
    expect(disabled(attachButton())).toBe(false);
    expect(disabled(sendButton())).toBe(true);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("другий фото не береться, поки перше не прибране", async () => {
    render(
      <MessageComposer
        onAttach={vi.fn().mockResolvedValue({ id: 12, key: KEY })}
        onSend={vi.fn()}
      />,
    );

    await chooseFile(photo());
    await waitFor(() => expect(screen.getByAltText("Прикріплене фото")).not.toBeNull());

    expect(disabled(attachButton())).toBe(true);
  });

  it("поки фото летить — надсилання чекає, щоб не пішло порожнім", async () => {
    let release: (value: { id: number; key: string }) => void = () => {};
    const onAttach = vi.fn().mockImplementation(
      () =>
        new Promise<{ id: number; key: string }>((resolve) => {
          release = resolve;
        }),
    );
    render(<MessageComposer onAttach={onAttach} onSend={vi.fn()} />);

    await chooseFile(photo());

    await waitFor(() => expect(disabled(attachButton())).toBe(true));
    expect(disabled(sendButton())).toBe(true);

    release({ id: 12, key: KEY });
    await waitFor(() => expect(disabled(sendButton())).toBe(false));
  });
});
