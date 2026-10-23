// @vitest-environment jsdom
/**
 * Картка запису: дотик на трекер відкриває її замість сторінки. Запис —
 * число або «так/ні», нотатка необовʼязкова в обох; дії (налаштувати,
 * дублювати, скинути, видалити) — окремі, і кожна питає там, де щось зникає.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerEntryModal.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker } from "@wwwuabot/shared/trackers";

const hooks = {
  alert: vi.fn(),
  confirm: vi.fn(),
  save: vi.fn(),
  close: vi.fn(),
  settings: vi.fn(),
  duplicate: vi.fn(),
  reset: vi.fn(),
  remove: vi.fn(),
};

vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({ alert: hooks.alert, confirm: hooks.confirm }),
}));

const { TrackerEntryModal } = await import("./TrackerEntryModal");

const water: Tracker = {
  id: 1,
  key: "water",
  title: "Вода",
  unit: "л",
  step: 0.25,
  goal: 2,
  min: 0,
  max: 20,
  icon: "droplet",
  groupId: 10,
  isBuiltin: true,
  mode: "sum",
  valueType: "number",
};

const habit: Tracker = {
  ...water,
  id: 9,
  key: "own-habit",
  title: "Тренування",
  unit: "",
  goal: null,
  valueType: "boolean",
};

function renderCard(tracker: Tracker = water, todayValue: number | null = 2.5) {
  return render(
    <TrackerEntryModal
      tracker={tracker}
      todayValue={todayValue}
      saving={false}
      onClose={hooks.close}
      onSave={hooks.save}
      onSettings={hooks.settings}
      onDuplicate={hooks.duplicate}
      onReset={hooks.reset}
      onDelete={hooks.remove}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.save.mockResolvedValue(true);
  hooks.remove.mockResolvedValue(true);
  hooks.reset.mockResolvedValue(1);
  hooks.duplicate.mockResolvedValue(true);
});

describe("запис числа", () => {
  it("день видно зразу: зведення й ціль — та сама правда, що в клітинці", () => {
    renderCard();

    expect(screen.getByText("Сьогодні: 2,5 л · ціль 2 л")).toBeTruthy();
  });

  it("значення й нотатка йдуть разом, і картка закривається після збереження", async () => {
    renderCard();
    const card = screen.getByRole("dialog", { name: "Вода" });

    await userEvent.type(within(card).getByLabelText("Значення, л"), "0.5");
    await userEvent.type(within(card).getByLabelText("Нотатка"), "після бігу");
    await userEvent.click(within(card).getByRole("button", { name: "Зберегти" }));

    expect(hooks.save).toHaveBeenCalledWith(0.5, "після бігу");
    expect(hooks.close).toHaveBeenCalled();
  });

  it("нотатка не обовʼязкова: без неї запис іде з порожнім рядком", async () => {
    renderCard();
    const card = screen.getByRole("dialog", { name: "Вода" });

    await userEvent.type(within(card).getByLabelText("Значення, л"), "1");
    await userEvent.click(within(card).getByRole("button", { name: "Зберегти" }));

    expect(hooks.save).toHaveBeenCalledWith(1, "");
  });

  it("порожнє поле — не запис: картка каже причину й лишається відкритою", async () => {
    renderCard();
    const card = screen.getByRole("dialog", { name: "Вода" });

    await userEvent.click(within(card).getByRole("button", { name: "Зберегти" }));

    expect(hooks.alert).toHaveBeenCalledWith("Введіть число — скільки вийшло.", {
      tone: "danger",
    });
    expect(hooks.save).not.toHaveBeenCalled();
    expect(hooks.close).not.toHaveBeenCalled();
  });
});

describe("запис «так-ні»", () => {
  it("статус обирають вкладкою, і нотатка теж необовʼязкова", async () => {
    renderCard(habit, null);
    const card = screen.getByRole("dialog", { name: "Тренування" });

    // Порожній вибір — це ще не відповідь, а не «0».
    await userEvent.click(within(card).getByRole("button", { name: "Зберегти" }));
    expect(hooks.alert).toHaveBeenCalledWith("Оберіть «Так» або «Ні».", { tone: "danger" });

    await userEvent.click(within(card).getByRole("tab", { name: "Ні" }));
    await userEvent.click(within(card).getByRole("button", { name: "Зберегти" }));

    expect(hooks.save).toHaveBeenCalledWith(0, "");
  });

  it("без запису дня каже це словами, і скидати нічого", () => {
    renderCard(habit, null);
    const card = screen.getByRole("dialog", { name: "Тренування" });

    expect(within(card).getByText("Сьогодні ще немає запису")).toBeTruthy();
    expect(within(card).queryByRole("button", { name: "Скинути сьогодні" })).toBeNull();
  });
});

describe("дії картки", () => {
  it("«Налаштувати» веде на картку трекера", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Налаштувати" }));

    expect(hooks.settings).toHaveBeenCalled();
  });

  it("«Дублювати» створює копію й закриває картку", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Дублювати" }));

    expect(hooks.duplicate).toHaveBeenCalled();
    expect(hooks.close).toHaveBeenCalled();
  });

  it("невдала копія лишає картку відкритою — причина вже на екрані", async () => {
    hooks.duplicate.mockResolvedValueOnce(false);
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Дублювати" }));

    expect(hooks.close).not.toHaveBeenCalled();
  });

  it("«Скинути сьогодні» питає, бо прибирає виміри", async () => {
    hooks.confirm.mockResolvedValueOnce(false);
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Скинути сьогодні" }));
    expect(hooks.reset).not.toHaveBeenCalled();

    hooks.confirm.mockResolvedValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Скинути сьогодні" }));
    expect(hooks.reset).toHaveBeenCalled();
  });

  it("«Видалити» прибирає трекер лише після підтвердження", async () => {
    hooks.confirm.mockResolvedValueOnce(true);
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Видалити" }));

    expect(hooks.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Видалити «Вода»?"),
      expect.objectContaining({ tone: "danger", confirmText: "Видалити" }),
    );
    expect(hooks.remove).toHaveBeenCalled();
    expect(hooks.close).toHaveBeenCalled();
  });
});
