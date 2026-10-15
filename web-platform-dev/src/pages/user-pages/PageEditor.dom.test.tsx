// @vitest-environment jsdom
/**
 * Редактор сторінки — **екран**, а не форма.
 *
 * Тут ламається мовчки: досить назвати кнопку «Зберегти» там, де це правка, — і
 * людина не знає, чи з'явиться друга сторінка; досить показати «збережено» на
 * власній здогадці замість відповіді сервера — і екран поведе далі сторінкою,
 * якої немає; досить лишити кнопку живою на порожній назві — і замість підказки
 * прийде 400 з сервера.
 *
 * Тому перевіряється саме те, чим екран керує: підписи кроку, стан перемикача
 * публічності, причина адреси, і те, що збережене приходить **із відповіді**, а
 * не з чернетки.
 *
 * @module web-platform-dev/src/pages/user-pages/PageEditor.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserPage } from "@wwwuabot/shared/pages";

/** Стан форми: ним керує тест, бо предмет перевірки — сам екран. */
const form = {
  template: {
    key: "card",
    label: "Візитка",
    fields: [{ key: "title", label: "Заголовок", look: "display" }],
  },
  draft: { template: "card", values: { title: "Привіт" }, address: "pryvit", isPublic: false },
  setValue: vi.fn(),
  address: "pryvit",
  setAddress: vi.fn(),
  addressIssue: null as string | null,
  isPublic: false,
  setPublic: vi.fn(),
  error: null as string | null,
  saving: false,
  empty: false,
  save: vi.fn(),
};

vi.mock("./usePageForm", () => ({ usePageForm: () => form }));
vi.mock("./PageEditorField", () => ({
  PageEditorField({
    field,
    value,
    onChange,
  }: {
    field: { key: string; label: string };
    value: string;
    onChange: (value: string) => void;
  }) {
    return (
      <label>
        {field.label}
        <input
          aria-label={field.label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  },
}));

const { PageEditor } = await import("./PageEditor");

const saved: UserPage = {
  id: 7,
  slug: "pryvit",
  title: "Привіт",
  template: "card",
  values: { title: "Привіт" },
  isPublic: false,
  staff: [],
  role: "owner",
  updatedAt: "2026-10-01 10:00:00",
};

const onBack = vi.fn();
const onSaved = vi.fn();

const renderEditor = (mode: "create" | "edit" = "create"): void => {
  render(
    <PageEditor
      mode={mode}
      initial={mode === "edit" ? { id: 7, template: "card" } : { template: "card" }}
      onBack={onBack}
      onSaved={onSaved}
    />,
  );
};

/** Кнопка кроку: поки пишеться, вона каже це словом («Зберігаємо…»). */
const saveButton = (): HTMLElement => screen.getByRole("button", { name: /Зберегти|Зберігаємо/ });

beforeEach(() => {
  vi.clearAllMocks();
  form.address = "pryvit";
  form.addressIssue = null;
  form.isPublic = false;
  form.error = null;
  form.saving = false;
  form.empty = false;
  form.save.mockResolvedValue(null);
});

describe("крок правки тексту", () => {
  it("створення зветься «Нова сторінка»", () => {
    renderEditor("create");

    expect(screen.getByText("Нова сторінка")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Зберегти/ })).toBeTruthy();
  });

  it("правка не обіцяє другої сторінки — вона «Змінити текст»", () => {
    renderEditor("edit");

    expect(screen.getByText("Змінити текст")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Зберегти зміни/ })).toBeTruthy();
  });

  it("текст шаблону стоїть полем у полотні сторінки", async () => {
    renderEditor();

    const field = screen.getByLabelText("Заголовок");
    await userEvent.type(field, "!");

    expect(form.setValue).toHaveBeenCalledWith("title", "Привіт!");
  });

  it("адреса показана як посилання, а не як код", () => {
    renderEditor();

    expect(screen.getByText("Посилання: /pryvit")).toBeTruthy();
  });

  it("зайняту адресу екран називає там, де поле, а не 400-ю", () => {
    form.addressIssue = "Ця адреса вже зайнята";
    renderEditor();

    expect(screen.getByText("Ця адреса вже зайнята")).toBeTruthy();
    expect(screen.queryByText("Посилання: /pryvit")).toBeNull();
  });

  it("публічність — перемикач сторінки цілком, а не поле тексту", async () => {
    renderEditor();

    expect(screen.getByText("Видно лише вам")).toBeTruthy();
    await userEvent.click(screen.getByRole("switch", { name: "Публічна сторінка" }));

    expect(form.setPublic).toHaveBeenCalledWith(true);
  });

  it("відкрита сторінка каже це словом перемикача", () => {
    form.isPublic = true;
    renderEditor();

    expect(screen.getByText("Видно всім")).toBeTruthy();
  });
});

describe("збереження", () => {
  it("екран веде далі **відповіддю сервера**, а не чернеткою", async () => {
    form.save.mockResolvedValue(saved);
    renderEditor();

    await userEvent.click(saveButton());

    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  it("невдале збереження нікуди не веде", async () => {
    form.save.mockResolvedValue(null);
    renderEditor();

    await userEvent.click(saveButton());

    expect(onSaved).not.toHaveBeenCalled();
  });

  it("порожню назву зберігати нема чим — кнопка вимкнена", () => {
    form.empty = true;
    renderEditor();

    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("поки зберігається, кнопка каже це словом і не тиснеться двічі", async () => {
    form.saving = true;
    renderEditor();

    expect(screen.getByText("Зберігаємо…")).toBeTruthy();
    await userEvent.click(saveButton());

    expect(form.save).not.toHaveBeenCalled();
  });

  it("причину відмови показує там, де її прочитають", () => {
    form.error = "Не вдалося зберегти сторінку.";
    renderEditor();

    expect(screen.getByRole("alert").textContent).toBe("Не вдалося зберегти сторінку.");
  });
});

describe("вихід", () => {
  it("«назад» і «скасувати» вертають туди, звідки прийшли", async () => {
    renderEditor();

    await userEvent.click(screen.getByRole("button", { name: "Назад" }));
    await userEvent.click(screen.getByRole("button", { name: "Скасувати" }));

    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
