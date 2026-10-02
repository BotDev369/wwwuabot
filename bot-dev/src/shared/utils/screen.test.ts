/** Regression tests for the Telegram screen keyboard builder. */

import { describe, expect, it } from "vitest";
import { FAVORITES_PATH, PROFILE_PATH, SPACE_PATH } from "@wwwuabot/shared/app/routes";
import { buildPlatformRow, buildScreenButtons, buildWebAppUrl } from "./screen";

const PLATFORM = "https://app.example.com";

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

  it("points the home page at the platform root", () => {
    // `/start` без параметра веде на головну (`slug = ""`), а її веб-шлях — `/`.
    expect(buildWebAppUrl("https://app.example.com", "/")).toBe("https://app.example.com/");
    expect(buildWebAppUrl("https://app.example.com/", "/")).toBe("https://app.example.com/");
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

  it("adds one button on the home page without dropping saved ones", () => {
    const buttons = buildScreenButtons(
      { buttons: [[{ text: "Дати", callback_data: "mydate" }]], web_path: "/" },
      "https://web-platform-dev.diskomate.workers.dev",
    );

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toEqual([{ text: "Дати", callback_data: "mydate" }]);
    expect(buttons[1]).toEqual([
      {
        text: "Відкрити сторінку",
        web_app: { url: "https://web-platform-dev.diskomate.workers.dev/" },
      },
    ]);
  });
});

describe("перший екран: один рядок екранів платформи", () => {
  const landing = {
    buttons: [[{ text: "МоїДати", callback_data: "mydate" }]],
    web_path: "/",
    landing: true,
  } as const;

  it("⛔ кнопок сторінки на ньому немає — вони ведуть у сценарії, яких ще немає", () => {
    const buttons = buildScreenButtons(landing, PLATFORM);

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveLength(3);
    expect(buttons[0].map((b) => b.text)).toEqual(["👤", "👍", "👥"]);
  });

  it("⛔ три кнопки ведуть на ті самі адреси, що й пункти футера платформи", () => {
    const buttons = buildScreenButtons(landing, PLATFORM);

    expect(buttons[0].map((b) => b.web_app?.url)).toEqual([
      `${PLATFORM}${PROFILE_PATH}`,
      `${PLATFORM}${FAVORITES_PATH}`,
      `${PLATFORM}${SPACE_PATH}`,
    ]);
  });

  it("⛔ без адреси платформи рядка немає — Telegram не прийме web_app без url", () => {
    expect(buildPlatformRow(undefined)).toBeNull();
    expect(buildScreenButtons(landing, undefined)).toEqual([]);
  });
});
