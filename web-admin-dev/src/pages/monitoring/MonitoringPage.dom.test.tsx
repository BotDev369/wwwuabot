// @vitest-environment jsdom
/**
 * «Моніторинг»: шапка, три стани й те, що кнопка збору кличе дію.
 *
 * Сторінка лише рендерить, тож діти-панелі тут заглушені: перевіряємо саме її.
 *
 * @module web-admin-dev/src/pages/monitoring/MonitoringPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mon = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("./useMonitoring", () => ({ useMonitoring: () => mon.state }));
const panels = vi.hoisted(() => ({ toggle: vi.fn() }));
vi.mock("./usePanels", () => ({
  usePanels: () => ({
    allOpen: false,
    toggleAll: vi.fn(),
    isOpen: () => false,
    toggle: panels.toggle,
  }),
}));
vi.mock("./ScopePanel", () => ({
  ScopePanel: ({ title, onToggle }: { title: string; onToggle: () => void }) => (
    <button type="button" data-testid="scope" onClick={onToggle}>
      {title}
    </button>
  ),
}));
vi.mock("./MetricDynamics", () => ({ MetricDynamics: () => <div data-testid="dynamics" /> }));
vi.mock("./MetricHistory", () => ({ MetricHistory: () => <div /> }));
vi.mock("./CollectorReportList", () => ({ CollectorReportList: () => <div /> }));
vi.mock("./SnapshotHistory", () => ({ SnapshotHistory: () => <div /> }));
vi.mock("./WorkspaceTable", () => ({ WorkspaceTable: () => <div /> }));

const { MonitoringPage } = await import("./MonitoringPage");

function state(overrides: Record<string, unknown> = {}) {
  return {
    summary: null,
    loading: false,
    collecting: false,
    error: "",
    collect: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  cleanup();
  mon.state = state();
});

describe("MonitoringPage", () => {
  it("підписана як глобальна: здоров'я всієї платформи", () => {
    render(<MonitoringPage />);

    expect(screen.getByText("Уся платформа")).toBeTruthy();
    expect(screen.getByText(/Зрізів ще немає/)).toBeTruthy();
  });

  it("поки вантажить — каже це, а не показує порожній зріз", () => {
    mon.state = state({ loading: true });
    render(<MonitoringPage />);

    expect(screen.getByText("Завантаження...")).toBeTruthy();
  });

  it("зі зрізом показує його стан, коміт і чесну примітку про токен", () => {
    mon.state = state({
      summary: {
        latest: {
          id: 1,
          collectedAt: "2026-11-27T10:00:00Z",
          trigger: "manual",
          status: "ok",
          ref: "abcdef1234567",
          collectors: [],
          values: [{ group: "total", metric: "loc", value: 10 }],
        },
        previous: null,
        history: [],
        sources: { githubTokenConfigured: false, repo: "org/repo", cronSchedule: "0 * * * *" },
      },
    });

    render(<MonitoringPage />);

    const scopes = screen.getAllByTestId("scope");
    expect(scopes).toHaveLength(2);
    for (const scope of scopes) fireEvent.click(scope);
    expect(panels.toggle).toHaveBeenCalledWith("code");
    expect(panels.toggle).toHaveBeenCalledWith("github");
    expect(screen.getByText(/1 значень/)).toBeTruthy();
    expect(screen.getByText(/коміт abcdef1/)).toBeTruthy();
    expect(screen.getByText(/Токен GitHub не доданий/)).toBeTruthy();
  });

  it("помилка збору видима, а кнопка кличе дію", () => {
    const collect = vi.fn();
    mon.state = state({ error: "KV недоступний", collect });
    render(<MonitoringPage />);

    expect(screen.getByText("KV недоступний")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Зібрати зріз" }));
    expect(collect).toHaveBeenCalledTimes(1);
  });
});
