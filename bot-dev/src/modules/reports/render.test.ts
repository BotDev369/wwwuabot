import { describe, expect, it } from "vitest";
import { renderReport } from "./render";
import type { ReportTemplate } from "./template";
import type { DeployReport } from "./types";

const template: ReportTemplate = {
  html:
    "<h1>Report</h1><p>{{statusIcon}} {{statusWord}} {{shaShort}} {{date}}</p>" +
    "<table>{{jobs}}</table><table>{{gates}}</table><p>{{gateCount}}</p>" +
    "<p>{{commitSubject}}</p><p>{{notes}}</p><p>{{limitations}}</p><p>{{env}}</p>" +
    '<tg-button-row><tg-button type="url" url="{{runUrl}}">run</tg-button></tg-button-row>',
  statusWords: { success: "ok" },
};

function report(overrides: Partial<DeployReport> = {}): DeployReport {
  return {
    runId: "1",
    status: "success",
    sha: "abcdef1234567",
    branch: "main",
    repo: "BotDev369/wwwuabot",
    runUrl: "https://github.com/BotDev369/wwwuabot/actions/runs/1",
    commitUrl: "https://github.com/BotDev369/wwwuabot/commit/abcdef1",
    jobs: [{ name: "checks", status: "success" }],
    gates: ["check:css"],
    commit: { subject: "Fix", author: "Buffy", files: 1, added: 2, removed: 0 },
    notes: [],
    limitations: [],
    platformUrl: "",
    ...overrides,
  };
}

const env = { date: "2026-11-14 05:00:00", platformUrl: "", errors: 0, lastCode: null };

describe("renderReport", () => {
  it("fills every placeholder and leaves none behind", () => {
    const html = renderReport(template, report(), env);
    expect(html).not.toContain("{{");
    expect(html).toContain("✓");
    expect(html).toContain("<td>checks</td>");
  });

  it("escapes commit text so it cannot change the markup", () => {
    const html = renderReport(
      template,
      report({ commit: { ...report().commit, subject: "<b>bold</b>" } }),
      env,
    );
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>bold</b>");
  });

  it("shows a dash when there is nothing to list", () => {
    const html = renderReport(template, report(), env);
    expect(html).toContain("<p>—</p>");
  });

  it("marks a failed job with a cross", () => {
    const html = renderReport(
      template,
      report({ status: "failure", jobs: [{ name: "checks", status: "failure" }] }),
      env,
    );
    expect(html).toContain("✗");
  });

  it("puts the error code next to the count", () => {
    const html = renderReport(template, report(), {
      ...env,
      errors: 3,
      lastCode: "INPUT_MEDIA_WIDGET_NOT_ALLOWED",
    });
    expect(html).toContain("<b>3</b>");
    expect(html).toContain("INPUT_MEDIA_WIDGET_NOT_ALLOWED");
  });
});
