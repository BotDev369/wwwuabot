// @vitest-environment jsdom
/**
 * Сторінка конструктора: порожній стан, шапка, режим JSON і зони.
 *
 * Тест тримає саме **класи**, а не інлайн: розмітка без `style={{}}` — це
 * вимога продукту (див. `npm run check:inline`), і повернутись вона не має.
 *
 * @module web-admin-dev/src/features/page-builder/PageBuilderPage.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PageBuilderPage } from "./PageBuilderPage";

const builder = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock("./usePageBuilder", () => ({ usePageBuilder: () => builder.value }));
vi.mock("./ZoneEditor", () => ({
  ZoneEditor: ({ zone, onToggleCollapse }: { zone: string; onToggleCollapse?: () => void }) => (
    <div data-testid={`zone-${zone}`}>
      {zone}
      <button type="button" onClick={onToggleCollapse}>
        toggle {zone}
      </button>
    </div>
  ),
}));

type Builder = Record<string, unknown>;
type Api = Record<string, ReturnType<typeof vi.fn>>;

function setup(overrides: Builder = {}) {
  builder.value = {
    slug: "probe",
    config: { zones: { main: [] } },
    scenarioTitle: "Тестова сторінка",
    loading: false,
    saveStatus: "idle",
    savingAction: null,
    error: null,
    jsonMode: false,
    jsonText: "",
    jsonError: null,
    expandedZones: new Set<string>(),
    allExpanded: false,
    allCollapsed: false,
    context: { slug: "probe", title: null, photoUrl: null },
    setJsonMode: vi.fn(),
    setJsonText: vi.fn(),
    setJsonError: vi.fn(),
    handleToggleZone: vi.fn(),
    handleExpandAll: vi.fn(),
    handleCollapseAll: vi.fn(),
    handleSave: vi.fn(),
    handleUpdateZoneBlocks: vi.fn(),
    handleExport: vi.fn(),
    handleImport: vi.fn(),
    handleBack: vi.fn(),
    ...overrides,
  };
  const view = render(<PageBuilderPage />);
  return { view, api: builder.value as Api };
}

/** Нуль інлайнових стилів на власних елементах сторінки. */
function expectNoInlineStyles(container: HTMLElement) {
  expect(container.querySelectorAll('[class*="pb-"][style]')).toHaveLength(0);
}

describe("PageBuilderPage", () => {
  it("без codeword показує порожній стан і кнопку назад", () => {
    const { api, view } = setup({ slug: null });

    expect(view.container.querySelector(".pb-page--empty")).toBeTruthy();
    expect(screen.getByText("Codeword не вказано")).toBeTruthy();
    expectNoInlineStyles(view.container);

    fireEvent.click(screen.getByText("Назад"));
    expect(api.handleBack).toHaveBeenCalledTimes(1);
  });

  it("малює шапку з назвою, підписом і діями", () => {
    const { view } = setup();

    expect(view.container.querySelector(".pb-head")).toBeTruthy();
    expect(view.container.querySelector(".pb-title")?.textContent).toContain("Page Builder: probe");
    expect(screen.getByText("Тестова сторінка")).toBeTruthy();
    expect(view.container.querySelectorAll(".pb-head__actions .pb-btn-sm").length).toBeGreaterThan(
      1,
    );
    expectNoInlineStyles(view.container);
  });

  it("без назви сценарію підзаголовка немає", () => {
    const { view } = setup({ scenarioTitle: null });

    expect(view.container.querySelector(".pb-subtitle")).toBeNull();
  });

  it("перемикач JSON віддає новий режим назовні", () => {
    const { api } = setup();

    fireEvent.click(screen.getByText(/JSON/));
    expect(api.setJsonMode).toHaveBeenCalledWith(true);
  });

  it("кнопка експорту веде до свого хука", () => {
    const { api } = setup();

    fireEvent.click(screen.getByText(/Експорт/));
    expect(api.handleExport).toHaveBeenCalledTimes(1);
  });

  it("у режимі JSON показує редактор і помилку розбору", () => {
    const { view } = setup({ jsonMode: true, jsonText: "{}", jsonError: "ламаний JSON" });

    const editor = view.container.querySelector(".pb-json__editor") as HTMLTextAreaElement;
    expect(editor).toBeTruthy();
    expect(editor.value).toBe("{}");
    expect(view.container.querySelector(".pb-json__error")?.textContent).toBe("ламаний JSON");
    expectNoInlineStyles(view.container);
  });

  it("без помилки смуги немає, а «Оновити» перечитує конфіг", () => {
    const { api, view } = setup({ jsonMode: true, jsonText: "старий" });

    expect(view.container.querySelector(".pb-json__error")).toBeNull();
    fireEvent.click(screen.getByText(/Оновити з конструктора/));

    expect(api.setJsonText).toHaveBeenCalledWith(JSON.stringify({ zones: { main: [] } }, null, 2));
    expect(api.setJsonError).toHaveBeenCalledWith(null);
  });

  it("«Застосувати JSON» і назад ведуть до своїх хуків", () => {
    const { api } = setup({ jsonMode: true });

    fireEvent.click(screen.getByText(/Застосувати JSON/));
    expect(api.handleImport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText(/^← Назад$/));
    expect(api.handleBack).toHaveBeenCalledTimes(1);
  });

  it("у режимі JSON перемикач веде назад у конструктор", () => {
    const { api } = setup({ jsonMode: true });

    fireEvent.click(screen.getByText(/Конструктор/));
    expect(api.setJsonMode).toHaveBeenCalledWith(false);
  });

  it("сегмент «Всі відкрито» підсвічується, коли всі зони розгорнуто", () => {
    const { view } = setup({ allExpanded: true });

    const active = view.container.querySelectorAll(".pb-segment__btn--active");
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain("Всі відкрито");
  });

  it("кнопка «Всі відкрито» кличе розгортання", () => {
    const { api } = setup();

    fireEvent.click(screen.getByTitle("Розгорнути всі акордеони"));
    expect(api.handleExpandAll).toHaveBeenCalledTimes(1);
  });

  it("помилка показується окремою смугою, а завантаження ховає зони", () => {
    const { view } = setup({ error: "Немає зв'язку", loading: true });

    expect(view.container.querySelector(".pb-error")?.textContent).toBe("Немає зв'язку");
    expect(view.container.querySelector(".pb-loading")).toBeTruthy();
    expect(screen.queryByTestId("zone-main")).toBeNull();
  });

  it("без завантаження малює всі зони й віддає кліки згортання", () => {
    const { api, view } = setup();

    expect(screen.getByTestId("zone-main")).toBeTruthy();
    expect(view.container.querySelectorAll("[data-testid^='zone-']").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "toggle main" }));
    expect(api.handleToggleZone).toHaveBeenCalledWith("main");

    fireEvent.click(screen.getByTitle("Згорнути всі акордеони"));
    expect(api.handleCollapseAll).toHaveBeenCalledTimes(1);
  });
});
