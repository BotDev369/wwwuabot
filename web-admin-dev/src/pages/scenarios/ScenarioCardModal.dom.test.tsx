// @vitest-environment jsdom
/**
 * Картка сценарію: вкладки, закриття по скриму й збереження — те, що видно лише в DOM.
 *
 * @module web-admin-dev/src/pages/scenarios/ScenarioCardModal.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useScenarioCard } from "./useScenarioCard";
import { ScenarioCardModal } from "./ScenarioCardModal";

vi.mock("@wwwuabot/ui/blocks", () => ({ registerAllBlocks: () => {} }));

vi.mock("@wwwuabot/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wwwuabot/shared")>();
  return {
    ...actual,
    SaveActionButtons: (props: {
      onSave?: () => void;
      onSaveAndClose?: () => void;
      onClose?: () => void;
    }) => (
      <div>
        <button type="button" onClick={props.onSave}>
          save
        </button>
        <button type="button" onClick={props.onSaveAndClose}>
          save-close
        </button>
      </div>
    ),
  };
});

vi.mock("./useScenarioCard", () => ({ useScenarioCard: vi.fn() }));
vi.mock("./ScenarioCardHeader", () => ({
  ScenarioCardHeader: ({ slug, rowId }: { slug: string; rowId: unknown }) => (
    <div data-testid="header">
      {slug}:{String(rowId)}
    </div>
  ),
}));
vi.mock("./ScenarioCardBody", () => ({
  ScenarioCardBody: ({ mainTab, subTab }: { mainTab: string; subTab: string }) => (
    <div data-testid="body">
      {mainTab}/{subTab}
    </div>
  ),
}));
vi.mock("./ScenarioCardTabs", () => ({
  MainTabs: ({ active, onSelect }: { active: string; onSelect: (tab: string) => void }) => (
    <div data-testid="main-tabs">
      <span>{active}</span>
      <button type="button" onClick={() => onSelect("share")}>
        до поділитись
      </button>
    </div>
  ),
  SubTabs: ({ active }: { active: string }) => <div data-testid="sub-tabs">{active}</div>,
}));
vi.mock("./FullscreenBuilder", () => ({
  FullscreenBuilder: () => <div data-testid="fullscreen" />,
}));

function card(overrides: Record<string, unknown> = {}) {
  return {
    allFields: { id: "7" },
    mainTab: "page",
    subTab: "preview",
    loading: false,
    saving: false,
    savingAction: null,
    justSaved: false,
    success: false,
    error: null,
    fullscreenBuilder: false,
    json: "{}",
    selectMainTab: vi.fn(),
    selectSubTab: vi.fn(),
    updateField: vi.fn(),
    handleSave: vi.fn(async () => undefined),
    openJsonTab: vi.fn(),
    openFullscreen: vi.fn(),
    closeFullscreen: vi.fn(),
    ...overrides,
  };
}

function modal(overrides: Partial<Parameters<typeof ScenarioCardModal>[0]> = {}) {
  const props = { slug: "viruvannia", onClose: vi.fn(), onSaved: vi.fn(), ...overrides };
  const view = render(<ScenarioCardModal {...props} />);
  return { props, view };
}

describe("ScenarioCardModal", () => {
  beforeEach(() => {
    vi.mocked(useScenarioCard).mockReturnValue(card() as never);
  });

  it("передає хуку адресу й початкову підвкладку", () => {
    modal({ initialSubTab: "json" });

    expect(useScenarioCard).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "viruvannia", initialSubTab: "json" }),
    );
  });

  it("малює шапку з номером рядка, вкладки й тіло", () => {
    modal();

    expect(screen.getByTestId("header").textContent).toBe("viruvannia:7");
    expect(screen.getByTestId("main-tabs").textContent).toContain("page");
    expect(screen.getByTestId("sub-tabs").textContent).toBe("preview");
    expect(screen.getByTestId("body").textContent).toBe("page/preview");
  });

  it("на вкладці «Поділитись» підвкладок немає", () => {
    vi.mocked(useScenarioCard).mockReturnValue(card({ mainTab: "share" }) as never);
    modal();

    expect(screen.queryByTestId("sub-tabs")).toBeNull();
  });

  it("клік по скриму закриває, клік по картці — ні", () => {
    const { props } = modal();

    fireEvent.click(screen.getByTestId("header"));
    expect(props.onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("header").parentElement as HTMLElement);
    expect(props.onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("header").parentElement?.parentElement as HTMLElement);
    expect(props.onClose).toHaveBeenCalled();
  });

  it("збереження йде двома діями: без закриття та із закриттям", () => {
    const handleSave = vi.fn(async () => undefined);
    vi.mocked(useScenarioCard).mockReturnValue(card({ handleSave }) as never);
    modal();

    fireEvent.click(screen.getByRole("button", { name: "save" }));
    expect(handleSave).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "save-close" }));
    expect(handleSave).toHaveBeenCalledWith(true);
  });

  it("повноекранний конструктор з'являється лише на вимогу", () => {
    modal();
    expect(screen.queryByTestId("fullscreen")).toBeNull();

    vi.mocked(useScenarioCard).mockReturnValue(card({ fullscreenBuilder: true }) as never);
    modal({ slug: "viruvannia-2" });
    expect(screen.getByTestId("fullscreen")).toBeTruthy();
  });
});
