import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../shared/types/env";

const screen = vi.hoisted(() => ({ deliverRichScreen: vi.fn() }));
const repo = vi.hoisted(() => ({ list: vi.fn(), getByRunId: vi.fn() }));

vi.mock("../../shared/utils/scenario-screen", () => ({
  deliverRichScreen: screen.deliverRichScreen,
}));

vi.mock("./repository", () => ({
  ReportRepository: class {
    list = repo.list;
    getByRunId = repo.getByRunId;
  },
}));

import { handleReportCommand } from "./history";

function ctx(): AppContext {
  return { env: {}, chat: { id: 5 } } as unknown as AppContext;
}

const stored = {
  runId: "42",
  createdAt: "2026-11-14 05:00:00",
  status: "success",
  sha: "abcdef1234567",
  html: "<p>report</p>",
  messageId: 7,
};

beforeEach(() => {
  vi.clearAllMocks();
  screen.deliverRichScreen.mockResolvedValue({ message_id: 1, widgetId: null });
  repo.list.mockResolvedValue([stored]);
  repo.getByRunId.mockResolvedValue(stored);
});

describe("handleReportCommand", () => {
  it("folds the history into accordions", async () => {
    expect(await handleReportCommand(ctx(), "/reports")).toBe(true);
    const html = String(screen.deliverRichScreen.mock.calls[0][1]);
    expect(html).toContain("<details>");
    expect(html).toContain("<code>abcdef1</code>");
    expect(html).toContain("<p>report</p>");
  });

  it("shows a dash when there is nothing yet", async () => {
    repo.list.mockResolvedValue([]);
    await handleReportCommand(ctx(), "/reports");
    expect(String(screen.deliverRichScreen.mock.calls[0][1])).toBe("<p>—</p>");
  });

  it("opens one report by run id", async () => {
    expect(await handleReportCommand(ctx(), "/report 42")).toBe(true);
    expect(repo.getByRunId).toHaveBeenCalledWith("42");
    expect(String(screen.deliverRichScreen.mock.calls[0][1])).toBe("<p>report</p>");
  });

  it("ignores a run id that is not a number", async () => {
    expect(await handleReportCommand(ctx(), "/report abc")).toBe(false);
    expect(screen.deliverRichScreen).not.toHaveBeenCalled();
  });

  it("leaves other commands to the router", async () => {
    expect(await handleReportCommand(ctx(), "/start")).toBe(false);
  });

  it("returns false when the report is gone", async () => {
    repo.getByRunId.mockResolvedValue(null);
    expect(await handleReportCommand(ctx(), "/report 404")).toBe(false);
  });
});
