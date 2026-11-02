// @vitest-environment jsdom
/**
 * Сторінка «Візуал»: продукт на одному екрані, теми й признак оновлення.
 *
 * Перевіряємо те, чого не видно з CSS: що сторінка показує справжні блоки, що
 * нова версія вигляду дає банер і що перемикач тем справді міняє тему.
 * @module web-admin-dev/src/pages/style/StylePage.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import catalog from "@wwwuabot/shared/styles/catalog.json";
import { StylePage } from "./StylePage";

const CATALOG = catalog as typeof catalog & { version?: string };
const VERSION = CATALOG.version ?? "abc1234";
const SEEN_KEY = "wwwuabot-style-seen";

function serve(version: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ ...CATALOG, version }), { status: 200 })),
  );
}

async function renderPage(): Promise<void> {
  render(<StylePage />);
  await screen.findByText(VERSION);
}

describe("сторінка «Візуал»", () => {
  beforeEach(() => {
    localStorage.clear();
    serve(VERSION);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
  });

  it("показує демосторінку продукту, а не перелік токенів", async () => {
    await renderPage();

    expect(screen.getByText("Числа")).toBeTruthy();
    expect(screen.getByText("Дані й графіки")).toBeTruthy();
    expect(screen.getByText("Люди без релігії, млн")).toBeTruthy();
    // Значення є і в показнику, і в таблиці — обидва справжні блоки.
    expect(screen.getAllByText("28,8%").length).toBeGreaterThan(0);
    expect(screen.queryByRole("tab", { name: "Токени" })).toBeNull();
  });

  it("каже, що вигляд оновився, коли версія інша", async () => {
    localStorage.setItem(
      SEEN_KEY,
      JSON.stringify({ version: "old0000", at: "2026-10-01T10:00:00.000Z" }),
    );
    serve("new1111");

    render(<StylePage />);

    expect(await screen.findByText("Вигляд оновився")).toBeTruthy();
    expect(screen.getByText(/Було old0000, стало new1111/)).toBeTruthy();
  });

  it("позначення переглянутим прибирає банер і запамʼятовує версію", async () => {
    localStorage.setItem(
      SEEN_KEY,
      JSON.stringify({ version: "old0000", at: "2026-10-01T10:00:00.000Z" }),
    );
    serve("new1111");
    render(<StylePage />);
    await screen.findByText("Вигляд оновився");

    fireEvent.click(screen.getByRole("button", { name: "Бачу" }));

    expect(screen.queryByText("Вигляд оновився")).toBeNull();
    const stored = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as { version?: string };
    expect(stored.version).toBe("new1111");
  });

  it("перемикач тем змінює тему продукту", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "Океан" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
  });

  it("каже про помилку, якщо каталог не прийшов", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );

    render(<StylePage />);

    expect(await screen.findByText(/не завантажився/)).toBeTruthy();
  });
});
