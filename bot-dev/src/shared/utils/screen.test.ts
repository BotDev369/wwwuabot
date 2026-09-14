/** Regression tests for the Telegram screen keyboard builder. */

import { describe, expect, it } from "vitest";
import { buildScreenButtons, buildWebAppUrl } from "./screen";

describe("buildWebAppUrl", () => {
  it("joins the configured platform origin with the current web route", () => {
    expect(buildWebAppUrl("https://app.example.com/", "/mydate/today")).toBe(
      "https://app.example.com/mydate/today",
    );
  });

  it("does not invent a URL when the platform is not configured", () => {
    expect(buildWebAppUrl(undefined, "/about")).toBeNull();
    expect(buildWebAppUrl("", "/about")).toBeNull();
  });
});

describe("buildScreenButtons", () => {
  const screen = {
    buttons: [[{ text: "Далі", callback_data: "next" }]],
    web_path: "/mydate/1980-03-03/today",
  } as const;

  it("keeps saved buttons and appends one web_app button", () => {
    const buttons = buildScreenButtons(screen, "https://app.example.com");

    expect(buttons[0]).toEqual([{ text: "Далі", callback_data: "next" }]);
    expect(buttons[1]).toEqual([
      {
        text: "Відкрити сторінку",
        web_app: { url: "https://app.example.com/mydate/1980-03-03/today" },
      },
    ]);
  });

  it("does not duplicate an already saved button", () => {
    const url = "https://app.example.com/about";
    const buttons = buildScreenButtons(
      { buttons: [[{ text: "Відкрити", web_app: { url } }]], web_path: "/about" },
      "https://app.example.com",
    );

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toEqual([{ text: "Відкрити", web_app: { url } }]);
  });

  it("returns a copy of saved buttons when the URL is missing", () => {
    const buttons = buildScreenButtons(screen, undefined);

    expect(buttons).toEqual(screen.buttons);
    expect(buttons).not.toBe(screen.buttons);
    expect(buttons[0]).not.toBe(screen.buttons[0]);
  });
});
