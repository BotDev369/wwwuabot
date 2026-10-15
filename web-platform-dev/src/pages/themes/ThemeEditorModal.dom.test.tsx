// @vitest-environment jsdom
/**
 * Редактор теми — модалка **поверх** меню вигляду.
 *
 * Тут ламається мовчки: досить назвати кнопку «Зберегти тему» там, де тему
 * правлять, — і людина чекає другої теми з тією ж назвою; досить показати
 * «збережено» без відповіді сервера — і тема, якої немає в бібліотеці, виглядає
 * збереженою; досить лишити кнопку живою на неповній палітрі — і сервер відмовить
 * там, де екран міг сказати це сам.
 *
 * Кольори й шрифт тут — **чужі** (з меню), тож перевіряється саме те, що редактор
 * додає: склад рядків, назва, публічність і стан збереження.
 *
 * @module web-platform-dev/src/pages/themes/ThemeEditorModal.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseFontChoiceResult, UseUserColorsResult } from "@wwwuabot/shared";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import type { MyThemesLibrary } from "./theme-library";

vi.mock("@wwwuabot/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wwwuabot/shared")>();
  return {
    ...actual,
    // Рядок кольору й рядок шрифту — зі своїм редактором усередині (`ColorEditor` /
    // `FontPicker`): тут предмет — сама модалка, тож рядок стискається до двох
    // кнопок, якими з нею розмовляють. `aria-expanded` лишається: він і є те,
    // що модалка вирішує.
    ColorSlotRow: ({
      slot,
      expanded,
      onToggle,
      onChange,
    }: {
      slot: { id: string; labelUk: string };
      expanded: boolean;
      onToggle: () => void;
      onChange: (value: string) => void;
    }) => (
      <div>
        <button type="button" aria-expanded={expanded} onClick={onToggle}>
          {`розкрити ${slot.id}`}
        </button>
        <button type="button" onClick={() => onChange("#123456")}>{`змінити ${slot.id}`}</button>
      </div>
    ),
    FontSlotRow: ({
      expanded,
      onToggle,
      onChange,
    }: {
      expanded: boolean;
      onToggle: () => void;
      onChange: (value: string) => void;
    }) => (
      <div>
        <button type="button" aria-expanded={expanded} onClick={onToggle}>
          розкрити шрифт
        </button>
        <button type="button" onClick={() => onChange("lora")}>
          змінити шрифт
        </button>
      </div>
    ),
  };
});

const dialog = { alert: vi.fn() };
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => dialog }));

/** Стан редактора: ним керує тест — предмет перевірки сама модалка. */
const editor = {
  name: "Ніч у Львові",
  setName: vi.fn(),
  isPublic: false,
  setIsPublic: vi.fn(),
  busy: false,
  save: vi.fn(),
};
vi.mock("./useSchemeEditor", () => ({ useSchemeEditor: () => editor }));

const { ThemeEditorModal } = await import("./ThemeEditorModal");

const colors: UseUserColorsResult = {
  current: { bg: "#101014", text: "#f5f5f7", accent: "#30d158" },
  complete: true,
  missing: [],
  warning: null,
  setSlot: vi.fn(),
  setColors: vi.fn(),
  applyPreset: vi.fn(),
};

const fonts: UseFontChoiceResult = { current: "inter", setFont: vi.fn() };

const library: MyThemesLibrary = {
  items: [],
  loading: false,
  error: null,
  reload: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
};

const scheme: ThemeScheme = {
  id: 3,
  ownerId: 1,
  name: "Ніч у Львові",
  bg: "#101014",
  text: "#f5f5f7",
  accent: "#30d158",
  font: "inter",
  isPublic: false,
  createdAt: "2026-10-01 10:00:00",
  updatedAt: "2026-10-01 10:00:00",
};

const onClose = vi.fn();

const renderEditor = (editing: ThemeScheme | null = null): void => {
  render(
    <ThemeEditorModal
      editing={editing}
      colors={colors}
      fonts={fonts}
      library={library}
      onClose={onClose}
    />,
  );
};

const saveButton = (): HTMLElement =>
  screen.getByRole("button", { name: /Зберегти тему|Оновити тему/ });

const expanded = (name: string): string | null =>
  screen.getByRole("button", { name }).getAttribute("aria-expanded");

beforeEach(() => {
  vi.clearAllMocks();
  colors.complete = true;
  colors.warning = null;
  editor.name = "Ніч у Львові";
  editor.isPublic = false;
  editor.busy = false;
  editor.save.mockResolvedValue(true);
});

describe("редактор теми", () => {
  it("нова тема й правка називають себе різними словами", () => {
    renderEditor();
    expect(screen.getByText("Налаштувати тему")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Зберегти тему" })).toBeTruthy();
  });

  it("правка не створює другої теми з тією ж назвою", () => {
    renderEditor(scheme);

    expect(screen.getByText("Правка теми")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Оновити тему" })).toBeTruthy();
  });

  it("показує три кольори й шрифт — той самий набір, що й меню", () => {
    renderEditor();

    for (const slot of ["bg", "text", "accent"]) {
      expect(screen.getByRole("button", { name: `розкрити ${slot}` })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "розкрити шрифт" })).toBeTruthy();
  });

  it("відкритий рівно один рядок: три повзунки на телефоні — це екран", async () => {
    renderEditor();

    // Типово відкритий фон — саме з нього починають.
    expect(expanded("розкрити bg")).toBe("true");
    expect(expanded("розкрити шрифт")).toBe("false");

    await userEvent.click(screen.getByRole("button", { name: "розкрити шрифт" }));

    expect(expanded("розкрити шрифт")).toBe("true");
    expect(expanded("розкрити bg")).toBe("false");
  });

  it("той самий рядок закривається другим дотиком", async () => {
    renderEditor();

    await userEvent.click(screen.getByRole("button", { name: "розкрити bg" }));

    expect(expanded("розкрити bg")).toBe("false");
  });

  it("колір править той, хто вміє його застосувати — меню вигляду", async () => {
    renderEditor();

    await userEvent.click(screen.getByRole("button", { name: "змінити bg" }));

    expect(colors.setSlot).toHaveBeenCalledWith("bg", "#123456");
  });

  it("шрифт править той самий вибір, що й панель вигляду", async () => {
    renderEditor();

    await userEvent.click(screen.getByRole("button", { name: "змінити шрифт" }));

    expect(fonts.setFont).toHaveBeenCalledWith("lora");
  });

  it("назва й публічність роблять із вибору тему", async () => {
    renderEditor();

    await userEvent.type(screen.getByLabelText("Назва теми"), "!");
    await userEvent.click(screen.getByRole("switch", { name: "Доступна публічно" }));

    expect(editor.setName).toHaveBeenCalled();
    expect(editor.setIsPublic).toHaveBeenCalledWith(true);
    expect(screen.getByText("Тему побачать інші й зможуть узяти собі")).toBeTruthy();
  });

  it("«збережено» показується **після** відповіді сервера", async () => {
    renderEditor();

    expect(screen.queryByText(/уже в моїх темах/)).toBeNull();
    await userEvent.click(saveButton());

    expect(editor.save).toHaveBeenCalled();
    expect(await screen.findByText(/уже в моїх темах/)).toBeTruthy();
  });

  it("невдале збереження не показує тему збереженою — причину каже діалог", async () => {
    editor.save.mockRejectedValue(new Error("Немає доступу"));
    renderEditor();

    await userEvent.click(saveButton());

    await waitFor(() =>
      expect(dialog.alert).toHaveBeenCalledWith("Немає доступу", { tone: "danger" }),
    );
    expect(screen.queryByText(/уже в моїх темах/)).toBeNull();
  });

  it("неповна палітра не дає зберегти — це видно до дотику", () => {
    colors.complete = false;
    renderEditor();

    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("попередження про нечитабельний вибір стоїть у формі", () => {
    colors.warning = "Текст майже не читається";
    renderEditor();

    expect(screen.getByText("Текст майже не читається")).toBeTruthy();
  });

  it("поки тема пишеться, кнопка не тиснеться вдруге", async () => {
    editor.busy = true;
    renderEditor();

    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(saveButton());

    expect(editor.save).not.toHaveBeenCalled();
  });
});

describe("вихід із редактора", () => {
  it("хрестик у шапці й «Закрити» внизу вертають у меню вигляду", async () => {
    renderEditor();

    const buttons = screen.getAllByRole("button", { name: "Закрити" });
    expect(buttons).toHaveLength(2);

    await userEvent.click(buttons[0]);
    await userEvent.click(buttons[1]);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("дотик по аркушу не закриває його — закриває лише дотик повз", async () => {
    renderEditor();

    await userEvent.click(screen.getByRole("dialog", { name: "Тема" }));
    expect(onClose).not.toHaveBeenCalled();

    const overlay = document.querySelector(".wb-modal-overlay");
    expect(overlay).toBeTruthy();
    await userEvent.click(overlay as HTMLElement);

    expect(onClose).toHaveBeenCalled();
  });
});
