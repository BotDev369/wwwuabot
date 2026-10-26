// @vitest-environment jsdom
/**
 * Картка запису: дотик на трекер відкриває її замість сторінки. Запис —
 * число або «так/ні», нотатка необовʼязкова в обох; публічність стоїть
 * перемикачем у самій картці, а аналітика, копія, переміщення, скидання й
 * прибирання — окремі дії, і кожна питає там, де щось зникає.
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
  analytics: vi.fn(),
  public: vi.fn(),
  duplicate: vi.fn(),
  move: vi.fn(),
  rename: vi.fn(),
  priority: vi.fn(),
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
      onAnalytics={hooks.analytics}
      onPublic={hooks.public}
      onDuplicate={hooks.duplicate}
      onMove={hooks.move}
      onRename={hooks.rename}
      onPriority={hooks.priority}
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
  hooks.rename.mockResolvedValue(true);
  hooks.priority.mockResolvedValue(true);
  hooks.public.mockResolvedValue(true);
});

describe("запис числа", () => {
  it("картка не переказує сьогоднішнє число — вона для запису", () => {
    renderCard();

    expect(screen.queryByText("2,5 л")).toBeNull();
    expect(screen.queryByText("Сьогодні · ціль 2 л")).toBeNull();
  });

  it("назва в шапці стає полем на дотик і зберігається Enter", async () => {
    renderCard();
    const header = screen.getByRole("dialog", { name: "Вода" });

    await userEvent.click(within(header).getByRole("button", { name: "Вода" }));
    const field = within(header).getByLabelText("Назва трекера");
    await userEvent.clear(field);
    await userEvent.type(field, "  Вода питна  {Enter}");

    expect(hooks.rename).toHaveBeenCalledWith("Вода питна");
    // Поле закривається: заголовок знову показує назву.
    expect(within(header).queryByLabelText("Назва трекера")).toBeNull();
  });

  it("пріоритет — кнопка в ряду дій і десять рівнів у модалці", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Пріоритет: відсутній" }));

    const grid = screen.getByRole("dialog", { name: "Пріоритет" });
    expect(within(grid).getByRole("button", { name: "Відсутній" })).toBeTruthy();
    await userEvent.click(within(grid).getByRole("button", { name: "3" }));

    expect(hooks.priority).toHaveBeenCalledWith(3);
  });

  it("рівень на кнопці каже, який він тепер", () => {
    renderCard({ ...water, priority: 7 });

    expect(screen.getByRole("button", { name: "Пріоритет: 7" })).toBeTruthy();
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

  it("«Зберегти» стоїть у низу поруч із «Видалити» й бере акцент, коли є що зберігати", async () => {
    renderCard();
    const card = screen.getByRole("dialog", { name: "Вода" });
    const save = within(card).getByRole("button", { name: "Зберегти" });

    // Порожня картка не кличе діяти: заливка — це «є що зберігати».
    expect(save.className).not.toContain("wb-btn-primary");
    expect(save.closest(".wb-tracker-bottom")?.textContent).toContain("Видалити");

    await userEvent.type(within(card).getByLabelText("Значення, л"), "1");

    expect(save.className).toContain("wb-btn-primary");
  });

  it("публічність — остання зона перед рядком «Видалити / Зберегти»", () => {
    renderCard();
    const card = screen.getByRole("dialog", { name: "Вода" });

    expect(card.querySelector(".wb-tracker-actions + .wb-tracker-public")).toBeTruthy();
    expect(card.querySelector(".wb-tracker-public + .wb-tracker-bottom")).toBeTruthy();
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
  it("статус обирають вкладкою з видимим станом, а зберігає «Зберегти»", async () => {
    renderCard(habit, null);
    const card = screen.getByRole("dialog", { name: "Тренування" });

    // Порожній вибір — це ще не відповідь, а не «0».
    await userEvent.click(within(card).getByRole("button", { name: "Зберегти" }));
    expect(hooks.alert).toHaveBeenCalledWith("Оберіть «Так» або «Ні».", { tone: "danger" });
    expect(hooks.close).not.toHaveBeenCalled();

    await userEvent.click(within(card).getByRole("tab", { name: "Ні" }));
    // Вибір видно одразу, і він не фіксує запис за людину: картка лишається.
    expect(within(card).getByRole("tab", { name: "Ні" }).className).toContain(
      "wb-tabs-btn--active",
    );
    expect(hooks.save).not.toHaveBeenCalled();
    expect(hooks.close).not.toHaveBeenCalled();

    await userEvent.click(within(card).getByRole("button", { name: "Зберегти" }));
    expect(hooks.save).toHaveBeenCalledWith(0, "");
    expect(hooks.close).toHaveBeenCalled();
  });

  it("нотатка необовʼязкова: зі статусом вона йде одним записом", async () => {
    renderCard(habit, null);
    const card = screen.getByRole("dialog", { name: "Тренування" });

    await userEvent.type(within(card).getByLabelText("Нотатка"), "після бігу");
    await userEvent.click(within(card).getByRole("tab", { name: "Так" }));
    await userEvent.click(within(card).getByRole("button", { name: "Зберегти" }));

    expect(hooks.save).toHaveBeenCalledWith(1, "після бігу");
    expect(hooks.close).toHaveBeenCalled();
  });

  it("без запису дня скидати нічого — кнопки немає", () => {
    renderCard(habit, null);
    const card = screen.getByRole("dialog", { name: "Тренування" });

    expect(within(card).queryByRole("button", { name: "Скинути сьогодні" })).toBeNull();
  });
});

describe("публічність", () => {
  it("перемикач стоїть у картці й каже, що відкривається лише форма мірки", () => {
    renderCard();

    const toggle = screen.getByRole("switch", { name: "Публічний" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/Записи не публікуються/)).toBeTruthy();
  });

  it("увімкнення йде на сервер, а не лише в стан", async () => {
    renderCard();

    await userEvent.click(screen.getByRole("switch", { name: "Публічний" }));

    expect(hooks.public).toHaveBeenCalledWith(true);
  });

  it("відкрите визначення показує перемикач увімкненим", () => {
    renderCard({ ...water, isPublic: true });

    expect(screen.getByRole("switch", { name: "Публічний" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });
});

describe("дії картки", () => {
  it("«Аналітика» відкриває окрему поверхню зі звітом та історією", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Аналітика" }));

    expect(hooks.analytics).toHaveBeenCalled();
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

  it("«Перемістити» передає вибір місця сторінці, а не закриває назавжди", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Перемістити" }));

    expect(hooks.move).toHaveBeenCalled();
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
