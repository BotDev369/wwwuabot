import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types/env";

const scenarios = vi.hoisted(() => ({ findByLookup: vi.fn() }));

vi.mock("../../repositories/scenario.repository", () => ({
  ScenarioRepository: class {
    findByLookup = scenarios.findByLookup;
  },
}));

import { loadReportTemplate } from "./template";

const env = { DB: {} as D1Database } as Env;

describe("loadReportTemplate", () => {
  it("returns the html and the status words", async () => {
    scenarios.findByLookup.mockResolvedValue({
      rich_html: "<p>{{statusWord}}</p>",
      widget_data: '{"success":"ok"}',
    });
    expect(await loadReportTemplate(env, 1)).toEqual({
      html: "<p>{{statusWord}}</p>",
      statusWords: { success: "ok" },
    });
  });

  it("asks the database for the report lookup", async () => {
    scenarios.findByLookup.mockResolvedValue(null);
    await loadReportTemplate(env, 1);
    expect(scenarios.findByLookup).toHaveBeenCalledWith("/report", 1);
  });

  it("returns null when the row is gone", async () => {
    scenarios.findByLookup.mockResolvedValue({ rich_html: "   ", widget_data: null });
    expect(await loadReportTemplate(env, 1)).toBeNull();
  });

  it("ignores broken words instead of failing the report", async () => {
    scenarios.findByLookup.mockResolvedValue({ rich_html: "<p>x</p>", widget_data: "not json" });
    expect(await loadReportTemplate(env, 1)).toEqual({ html: "<p>x</p>", statusWords: {} });
  });
});
