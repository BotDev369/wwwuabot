// @vitest-environment jsdom
/**
 * «Хто бачить сторінку» й стартова вкладка картки: поле глядачів зберігає
 * рівно тих, кого обрали, а «Бот» відкриває картку на поданні, не на сторінці.
 *
 * @module web-admin-dev/src/pages/scenarios/viewers.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  listUsers: vi.fn(),
  readScenarioAll: vi.fn(),
  updateScenarioFields: vi.fn(),
  open: vi.fn(),
  apply: vi.fn(),
}));

vi.mock("../../shared/api/users.api", () => ({ listUsers: api.listUsers }));
vi.mock("../../shared/api/scenarios.api", () => ({
  readScenarioAll: api.readScenarioAll,
  updateScenarioFields: api.updateScenarioFields,
}));
vi.mock("./useScenarioJsonEditor", () => ({
  useScenarioJsonEditor: () => ({ open: api.open, applyToFields: api.apply }),
}));
vi.mock("./useScenarioShortcuts", () => ({ useScenarioShortcuts: () => {} }));

const { ViewerPicker } = await import("./ViewerPicker");
const { SharedFieldsEditor } = await import("./SharedFieldsEditor");
const { useScenarioCard } = await import("./useScenarioCard");

const PEOPLE = [
  {
    user_id: 1,
    username: "olena",
    first_name: "Олена",
    last_name: "",
    platform_username: "olena_p",
  },
  { user_id: 2, username: "ihor", first_name: "", last_name: "", platform_username: null },
];

function picker(fields: Record<string, unknown>) {
  const updateField = vi.fn();
  render(<ViewerPicker fields={fields} updateField={updateField} />);
  return updateField;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listUsers.mockResolvedValue(PEOPLE);
  api.readScenarioAll.mockResolvedValue({ id: 1, slug: "nastya" });
  api.updateScenarioFields.mockResolvedValue(undefined);
  api.apply.mockReturnValue({ ok: true, fields: {} });
});

describe("ViewerPicker", () => {
  it("показує людей із бази й додає обраного до viewer_ids", async () => {
    const updateField = picker({ viewer_ids: "[]" });

    expect(await screen.findByText("olena_p · 1")).toBeTruthy();
    expect(screen.getByText("ihor · 2")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("olena_p · 1"));
    expect(updateField).toHaveBeenCalledWith("viewer_ids", "[1]");
  });

  it("знімає позначку з того, хто вже в списку", async () => {
    const updateField = picker({ viewer_ids: "[1,2]" });

    await screen.findByText("olena_p · 1");
    fireEvent.click(screen.getByLabelText("olena_p · 1"));
    expect(updateField).toHaveBeenCalledWith("viewer_ids", "[2]");
  });

  it("пошук звужує людей, а порожній результат каже про це", async () => {
    picker({ viewer_ids: "[]" });

    await screen.findByText("ihor · 2");
    fireEvent.change(screen.getByPlaceholderText(/Пошук за іменем/), { target: { value: "ihor" } });
    expect(screen.queryByText("olena_p · 1")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(/Пошук за іменем/), { target: { value: "zzz" } });
    expect(screen.getByText("Нікого не знайдено.")).toBeTruthy();
  });

  it("публічність знімає потребу обирати людей", async () => {
    const updateField = picker({ viewer_ids: "[]", is_public: 0 });

    await screen.findByText("olena_p · 1");
    fireEvent.click(screen.getByLabelText("Відкрита всім (публічна)"));

    expect(updateField).toHaveBeenCalledWith("is_public", 1);
  });

  it("невдалий список людей — це помилка, а не «нікого немає»", async () => {
    api.listUsers.mockRejectedValue(new Error("Немає доступу"));

    picker({ viewer_ids: "[]" });

    expect(await screen.findByText(/Список людей не завантажився/)).toBeTruthy();
    expect(screen.queryByText("Нікого не знайдено.")).toBeNull();
  });
});

describe("SharedFieldsEditor", () => {
  it("тримає поле глядачів поруч зі спільними полями", async () => {
    const updateField = vi.fn();
    render(
      <SharedFieldsEditor
        fields={{ slug: "nastya", viewer_ids: "[]" }}
        updateField={updateField}
      />,
    );

    expect(screen.getByText("Хто бачить сторінку")).toBeTruthy();
    expect(await screen.findByText("olena_p · 1")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Заголовок сторінки"), {
      target: { value: "Нова" },
    });
    expect(updateField).toHaveBeenCalledWith("title", "Нова");
  });

  it("адресу з «_» позначає як недійсну", () => {
    render(<SharedFieldsEditor fields={{ slug: "nastya_bad" }} updateField={vi.fn()} />);

    expect(screen.getByText(/«_» заборонений/)).toBeTruthy();
  });
});

describe("useScenarioCard", () => {
  it("відкриває картку на поданні бота", async () => {
    const { result } = renderHook(() =>
      useScenarioCard({
        slug: "nastya",
        onSaved: vi.fn(),
        onClose: vi.fn(),
        initialMainTab: "bot",
      }),
    );

    expect(result.current.mainTab).toBe("bot");
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allFields.id).toBe(1);
  });

  it("перемикання вкладки повертає підвкладку до превʼю", async () => {
    const { result } = renderHook(() =>
      useScenarioCard({ slug: "nastya", onSaved: vi.fn(), onClose: vi.fn() }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.selectSubTab("constructor"));
    act(() => result.current.selectMainTab("shared"));
    expect(result.current.subTab).toBe("preview");

    act(() => result.current.updateField("title", "Нова"));
    expect(result.current.allFields.title).toBe("Нова");

    act(() => result.current.openJsonTab());
    expect(api.open).toHaveBeenCalled();
    expect(result.current.subTab).toBe("json");
  });

  it("немає рядка — картка каже про це", async () => {
    api.readScenarioAll.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useScenarioCard({ slug: "zniklyi", onSaved: vi.fn(), onClose: vi.fn() }),
    );

    await waitFor(() => expect(result.current.error).toBe("Сценарій не знайдено"));
    expect(result.current.loading).toBe(false);
  });

  it("зберігає поля й після успіху закриває картку", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useScenarioCard({ slug: "nastya", onSaved, onClose }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSave(false);
    });

    expect(api.updateScenarioFields).toHaveBeenCalledWith(
      { id: 1, slug: "nastya" },
      expect.anything(),
    );
    expect(result.current.success).toBe(true);
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 2000 });
    expect(onClose).toHaveBeenCalled();
  });

  it("збій збереження лишає картку відкритою з причиною", async () => {
    api.updateScenarioFields.mockRejectedValue(new Error("D1 down"));
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useScenarioCard({ slug: "nastya", onSaved: vi.fn(), onClose }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSave(false);
    });

    expect(result.current.error).toBe("D1 down");
    expect(result.current.success).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});
