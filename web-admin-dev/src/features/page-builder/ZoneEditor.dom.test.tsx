// @vitest-environment jsdom
/**
 * Редактор зони: згортання, порядок блоків, додавання, перейменування, умови,
 * видалення й налаштування сайдбару. Разом із ним виконується і вкладений
 * `BlockEditor`, бо саме він малює рядок кожного блоку.
 *
 * @module web-admin-dev/src/features/page-builder/ZoneEditor.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { BlockContext, PageBlock, SidebarSettings } from "@wwwuabot/shared/types/page-config";
import { ZoneEditor } from "./ZoneEditor";

const context: BlockContext = { slug: "probe", title: null, photoUrl: null };

function makeBlock(overrides: Partial<PageBlock> & Pick<PageBlock, "id">): PageBlock {
  return { type: "text", order: 0, props: {}, ...overrides };
}

type Props = Parameters<typeof ZoneEditor>[0];

function setup(overrides: Partial<Props> = {}) {
  const update = vi.fn();
  const props: Props = {
    zone: "main",
    blocks: [],
    context,
    onUpdateBlocks: update,
    ...overrides,
  };
  const view = render(<ZoneEditor {...props} />);
  return { props, update, ...view };
}

function expandBlock(container: HTMLElement) {
  const editor = container.querySelector(".pb-block-editor") as HTMLElement;
  fireEvent.click(within(editor).getByText("▸"));
  return editor;
}

describe("ZoneEditor", () => {
  it("згорнута зона ховає вміст, а клік по заголовку його відкриває", () => {
    setup();

    expect(screen.queryByText("Зона порожня. Додайте блок нижче.")).toBeNull();

    fireEvent.click(screen.getByText("Main"));

    expect(screen.getByText("Зона порожня. Додайте блок нижче.")).toBeTruthy();
  });

  it("контрольована зона віддає клік назовні, а не змінює себе сама", () => {
    const toggle = vi.fn();
    setup({ collapsed: false, onToggleCollapse: toggle });

    fireEvent.click(screen.getByText("Main"));

    expect(toggle).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Зона порожня. Додайте блок нижче.")).toBeTruthy();
  });

  it("без onAddBlock показує типи зони й додає вибраний", () => {
    const { update } = setup();
    fireEvent.click(screen.getByText("Main"));

    const add = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.startsWith("+ "));
    expect(add).toBeTruthy();
    fireEvent.click(add as HTMLButtonElement);

    expect(update).toHaveBeenCalledTimes(1);
    const [zone, blocks] = update.mock.calls[0];
    expect(zone).toBe("main");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].order).toBe(0);
  });

  it("з onAddBlock кнопка віддає зону, а не тип", () => {
    const add = vi.fn();
    setup({ onAddBlock: add });
    fireEvent.click(screen.getByText("Main"));

    fireEvent.click(screen.getByText("+ Додати блок"));

    expect(add).toHaveBeenCalledWith("main");
  });

  it("сортує блоки за order і міняє їх місцями кнопками", () => {
    const first = makeBlock({ id: "a", name: "Перший", order: 0 });
    const second = makeBlock({ id: "b", name: "Другий", order: 1 });
    const { update } = setup({ blocks: [second, first], collapsed: false });

    expect(screen.getAllByText(/^(Перший|Другий)$/).map((node) => node.textContent)).toEqual([
      "Перший",
      "Другий",
    ]);

    const up = screen.getAllByTitle("Вгору") as HTMLButtonElement[];
    const down = screen.getAllByTitle("Вниз") as HTMLButtonElement[];
    expect(up[0].disabled).toBe(true);
    expect(down[1].disabled).toBe(true);

    fireEvent.click(down[0]);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toBe("main");
    expect(update.mock.calls[0][1].map((block: PageBlock) => block.name)).toEqual([
      "Другий",
      "Перший",
    ]);
  });

  it("розгортає блок, показує вкладені й додає дитину", () => {
    const child = makeBlock({ id: "child", name: "Дочірній", order: 0 });
    const parent = makeBlock({
      id: "parent",
      name: "Батьківський",
      order: 0,
      children: [child],
      conditions: { role: ["admin"] },
    });
    const { container, update } = setup({ blocks: [parent], collapsed: false });

    expect(screen.getByText("COND")).toBeTruthy();
    const editor = expandBlock(container);
    expect(editor.className).toBe("pb-block-editor");
    expect(screen.getByText("Вкладені блоки (1)")).toBeTruthy();
    expect(screen.getByText("Дочірній")).toBeTruthy();
    expect(container.querySelector(".pb-block-editor--nested")).toBeTruthy();

    const header = editor.querySelector(".pb-be-header") as HTMLElement;
    fireEvent.click(within(header).getByTitle("Умови показу"));
    expect(screen.getByText("Умови показу блоку")).toBeTruthy();

    fireEvent.click(screen.getByText("+ Додати"));

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][1][0].children).toHaveLength(2);
  });

  it("зміна типу віддає новий тип блоку", () => {
    const parent = makeBlock({ id: "parent", name: "Блок" });
    const { container, update } = setup({ blocks: [parent], collapsed: false });
    const editor = expandBlock(container);

    const select = within(editor).getAllByRole("combobox")[0] as HTMLSelectElement;
    const next = [...select.options].find((option) => option.value !== "text");
    expect(next).toBeTruthy();
    fireEvent.change(select, { target: { value: next?.value } });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][1][0].type).toBe(next?.value);
  });

  it("перейменування зберігається Enter", () => {
    const parent = makeBlock({ id: "parent", name: "Стара" });
    const { update } = setup({ blocks: [parent], collapsed: false });

    fireEvent.click(screen.getByText("Стара"));
    const input = screen.getByDisplayValue("Стара");
    fireEvent.change(input, { target: { value: "Нова" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][1][0].name).toBe("Нова");
  });

  it("Escape скасовує перейменування без запису", () => {
    const parent = makeBlock({ id: "parent", name: "Стара" });
    const { update } = setup({ blocks: [parent], collapsed: false });

    fireEvent.click(screen.getByText("Стара"));
    const input = screen.getByDisplayValue("Стара");
    fireEvent.change(input, { target: { value: "Нова" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(update).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue("Нова")).toBeNull();
  });

  it("видалення блоку віддає порожню зону", () => {
    const parent = makeBlock({ id: "parent", name: "Блок" });
    const { update } = setup({ blocks: [parent], collapsed: false });

    fireEvent.click(screen.getByTitle("Видалити блок"));

    expect(update).toHaveBeenCalledWith("main", []);
  });

  it("зона sidebar показує налаштування й віддає зміну", () => {
    const onUpdate = vi.fn();
    const settings: SidebarSettings = {
      closeButtonPosition: "left",
      fontSize: "sm",
      itemSpacing: "sm",
    };
    setup({
      zone: "sidebar",
      collapsed: false,
      sidebarSettings: settings,
      onUpdateSidebarSettings: onUpdate,
    });

    expect(screen.getByText("Налаштування сайдбару")).toBeTruthy();
    fireEvent.click(screen.getByText("Справа"));

    expect(onUpdate).toHaveBeenCalledWith({ ...settings, closeButtonPosition: "right" });
  });
});
