// @vitest-environment jsdom
/**
 * Модалка «Групи»: дерево з відступом глибини, стрілки порядку з межами
 * сусідів, дії рядка в повноекранному меню (AGENTS.md §4), ввід — через
 * спільний `useDialog`; типова тематика каталогу пункту прибирання не має.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerGroupsModal.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TrackerGroup } from "@wwwuabot/shared/trackers";

const hooks = {
  prompt: vi.fn(),
  confirm: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  move: vi.fn(),
  close: vi.fn(),
};

vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({ prompt: hooks.prompt, confirm: hooks.confirm }),
}));

const { TrackerGroupsModal } = await import("./TrackerGroupsModal");

const own: TrackerGroup = { id: 10, parentId: null, title: "Свої", key: "own" };
const routine: TrackerGroup = { id: 11, parentId: null, title: "Режим", key: "routine" };
const home: TrackerGroup = { id: 12, parentId: null, title: "Дім", key: null };
const morning: TrackerGroup = { id: 13, parentId: 11, title: "Ранок", key: null };

function renderModal(groups: TrackerGroup[] = [own, routine, morning, home]) {
  return render(
    <TrackerGroupsModal
      groups={groups}
      onClose={hooks.close}
      onCreate={hooks.create}
      onUpdate={hooks.update}
      onDelete={hooks.remove}
      onMove={hooks.move}
    />,
  );
}

/** Назви рядків дерева — у порядку показу. */
function rowTitles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".wb-groups-mgr-title")).map(
    (node) => node.textContent ?? "",
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("дерево модалки", () => {
  it("підгрупа малюється одразу після батька і глибше", () => {
    const view = renderModal();

    expect(rowTitles(view.container)).toEqual(["Свої", "Режим", "Ранок", "Дім"]);
    const rows = view.container.querySelectorAll(".wb-groups-mgr-row");
    expect(rows[2]?.getAttribute("style")).toContain("margin-inline-start: 16px");
    expect(rows[0]?.getAttribute("style") ?? "").not.toContain("16px");
  });

  it("край стрілки сусідів вимкнений: перший не йде вгору, останній — униз", async () => {
    renderModal();

    expect(
      (screen.getByRole("button", { name: "Перемістити вгору: Свої" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Перемістити вниз: Дім" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    // Середина верхнього рівня рухається в обидві сторони.
    expect(
      (screen.getByRole("button", { name: "Перемістити вгору: Режим" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    // Єдина підгрупа — і перша, і остання серед своїх.
    expect(
      (screen.getByRole("button", { name: "Перемістити вниз: Ранок" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("стрілка шле рух того самого рядка", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Перемістити вниз: Режим" }));

    expect(hooks.move).toHaveBeenCalledWith(11, "down");
  });

  it("«Нова група» питає назву й створює корінь", async () => {
    renderModal();
    hooks.prompt.mockResolvedValueOnce("  Бізнес  ");
    await userEvent.click(screen.getByRole("button", { name: "Нова група" }));

    expect(hooks.prompt).toHaveBeenCalledWith("Назва групи:", expect.anything());
    expect(hooks.create).toHaveBeenCalledWith("Бізнес", null);
  });
});

describe("дії рядка", () => {
  async function openRowMenu(title: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: `Дії групи ${title}` }));
  }

  it("меню рядка несе підгрупу, перейменування й прибирання", async () => {
    renderModal();
    await openRowMenu("Дім");

    const dialog = screen.getByRole("dialog", { name: "Дім" });
    expect(within(dialog).getByRole("button", { name: "Додати підгрупу" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Перейменувати" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Прибрати групу" })).toBeTruthy();
  });

  it("підгрупа мітить батька, перейменування шле обрізану назву", async () => {
    renderModal();
    hooks.prompt.mockResolvedValueOnce("Кав'ярня").mockResolvedValueOnce("  Новий дім  ");
    await openRowMenu("Дім");
    await userEvent.click(screen.getByRole("button", { name: "Додати підгрупу" }));
    expect(hooks.create).toHaveBeenCalledWith("Кав'ярня", 12);

    await openRowMenu("Дім");
    await userEvent.click(screen.getByRole("button", { name: "Перейменувати" }));
    expect(hooks.update).toHaveBeenCalledWith(12, { title: "Новий дім" });
  });

  it("меню рядка закривається перед діалогом — після скасування лишається дерево", async () => {
    renderModal();
    hooks.prompt.mockResolvedValueOnce(null);
    await openRowMenu("Дім");
    await userEvent.click(screen.getByRole("button", { name: "Перейменувати" }));

    expect(screen.queryByRole("dialog", { name: "Дім" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Групи" })).toBeTruthy();
    expect(hooks.update).not.toHaveBeenCalled();
  });

  it("прибирання шле лише підтверджене", async () => {
    renderModal();
    hooks.confirm.mockResolvedValueOnce(false);
    await openRowMenu("Дім");
    await userEvent.click(screen.getByRole("button", { name: "Прибрати групу" }));
    expect(hooks.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Прибрати «Дім»?"),
      expect.objectContaining({ tone: "danger", confirmText: "Прибрати" }),
    );
    expect(hooks.remove).not.toHaveBeenCalled();

    hooks.confirm.mockResolvedValueOnce(true);
    await openRowMenu("Дім");
    await userEvent.click(screen.getByRole("button", { name: "Прибрати групу" }));
    expect(hooks.remove).toHaveBeenCalledWith(12);
  });

  it("типовій тематиці меню не пропонує прибирання", async () => {
    renderModal();
    await openRowMenu("Режим");

    expect(screen.queryByRole("button", { name: "Прибрати групу" })).toBeNull();
    expect(screen.getByRole("button", { name: "Перейменувати" })).toBeTruthy();
  });

  it("закриття модалки йде на ту саму ручку, що й відкриття", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Закрити" }));

    expect(hooks.close).toHaveBeenCalledTimes(1);
  });
});
