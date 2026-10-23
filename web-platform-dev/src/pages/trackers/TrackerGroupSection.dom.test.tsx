// @vitest-environment jsdom
/**
 * Дії групи: меню на все вікно (AGENTS.md §4), ввід — через спільний
 * `useDialog`, типова тематика каталогу пункту прибирання не має.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerGroupSection.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker, TrackerGroup } from "@wwwuabot/shared/trackers";

const hooks = {
  prompt: vi.fn(),
  confirm: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
  toggle: vi.fn(),
  open: vi.fn(),
  newTracker: vi.fn(),
  clear: vi.fn(),
};

vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({ prompt: hooks.prompt, confirm: hooks.confirm }),
}));

const { TrackerGroupSection } = await import("./TrackerGroupSection");
type TreeView = import("./trackers-view").TrackerGroupTreeView;

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
  groupId: 9,
  isBuiltin: true,
  mode: "sum",
  valueType: "number",
};

const ownGroup: TrackerGroup = { id: 9, parentId: null, title: "Режим", key: null };
const builtinGroup: TrackerGroup = { id: 10, parentId: null, title: "Активність", key: "activity" };

function viewOf(group: TrackerGroup, trackers: Tracker[]): TreeView {
  return {
    group,
    children: [],
    trackers,
    count: trackers.length,
  };
}

function renderSection(
  group: TrackerGroup,
  trackers: Tracker[] = [water],
): ReturnType<typeof render> {
  return render(
    <TrackerGroupSection
      view={viewOf(group, trackers)}
      depth={0}
      cellsOf={() => [{ day: "2026-10-17", value: 2, goalMet: false }]}
      today="2026-10-17"
      saving={false}
      isOpen={() => true}
      onToggle={hooks.toggle}
      onOpenTracker={hooks.open}
      onSave={hooks.save}
      onCreateGroup={hooks.create}
      onUpdateGroup={hooks.update}
      onDeleteGroup={hooks.remove}
      onNewTracker={hooks.newTracker}
      onClearTrackers={hooks.clear}
    />,
  );
}

async function openMenu(title: string): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: `Дії групи ${title}` }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("меню групи", () => {
  it("дії відкривають картку з усіма пунктами", async () => {
    renderSection(ownGroup);
    await openMenu("Режим");

    const dialog = screen.getByRole("dialog", { name: "Режим" });
    // Картка, а не аркуш на весь екран: пунктів мало, і прилипати до верху нічому.
    expect(dialog.classList.contains("wb-modal--card")).toBe(true);
    expect(screen.getByRole("button", { name: "Додати підгрупу" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Новий трекер" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Перейменувати" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Видалити групу" })).toBeTruthy();
  });

  it("«Новий трекер» відкриває форму з цією групою", async () => {
    renderSection(ownGroup);
    await openMenu("Режим");

    await userEvent.click(screen.getByRole("button", { name: "Новий трекер" }));

    expect(hooks.newTracker).toHaveBeenCalledWith(9);
  });

  it("перейменування шле обрізану назву того самого рядка", async () => {
    renderSection(ownGroup);
    hooks.prompt.mockResolvedValueOnce("  Новий режим  ");
    await openMenu("Режим");
    await userEvent.click(screen.getByRole("button", { name: "Перейменувати" }));

    expect(hooks.prompt).toHaveBeenCalledWith(
      "Назва групи:",
      expect.objectContaining({ defaultValue: "Режим" }),
    );
    expect(hooks.update).toHaveBeenCalledWith(9, { title: "Новий режим" });
  });

  it("порожній ввід відсікає валідатор, скасування — нічого не шле", async () => {
    renderSection(ownGroup);
    hooks.prompt.mockResolvedValueOnce(null);
    await openMenu("Режим");
    await userEvent.click(screen.getByRole("button", { name: "Перейменувати" }));

    const options = hooks.prompt.mock.calls[0][1] as {
      validate: (value: string) => string | null;
    };
    expect(options.validate("   ")).toBe("Порожньо");
    expect(options.validate("Гідно")).toBeNull();
    expect(hooks.update).not.toHaveBeenCalled();
  });

  it("додавання підгрупи мітить батька одразу", async () => {
    renderSection(ownGroup);
    hooks.prompt.mockResolvedValueOnce("Біг");
    await openMenu("Режим");
    await userEvent.click(screen.getByRole("button", { name: "Додати підгрупу" }));

    expect(hooks.create).toHaveBeenCalledWith("Біг", 9);
  });

  it("видалення групи питає й шле лише підтверджене", async () => {
    renderSection(ownGroup);
    hooks.confirm.mockResolvedValueOnce(false);
    await openMenu("Режим");
    await userEvent.click(screen.getByRole("button", { name: "Видалити групу" }));

    expect(hooks.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Видалити «Режим»?"),
      expect.objectContaining({ tone: "danger", confirmText: "Видалити" }),
    );
    expect(hooks.remove).not.toHaveBeenCalled();

    hooks.confirm.mockResolvedValueOnce(true);
    await openMenu("Режим");
    await userEvent.click(screen.getByRole("button", { name: "Видалити групу" }));
    expect(hooks.remove).toHaveBeenCalledWith(9);
  });

  it("типовій тематиці пропонує прибрати трекери, а не видалити групу", async () => {
    renderSection(builtinGroup);
    await openMenu("Активність");

    expect(screen.queryByRole("button", { name: "Видалити групу" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Прибрати трекери групи" }));

    expect(hooks.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Сама тематика лишиться"),
      expect.objectContaining({ tone: "danger", confirmText: "Прибрати" }),
    );
  });

  it("кожен трекер групи малює свій рядок матриці", () => {
    renderSection(ownGroup, [water, { ...water, id: 4, title: "Кава" }]);

    expect(screen.getByRole("button", { name: "Вода" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Кава" })).toBeTruthy();
  });
});
