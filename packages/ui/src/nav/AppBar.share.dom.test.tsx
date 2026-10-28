// @vitest-environment jsdom
/**
 * Вікно «Поділитись» відкривається з хедера, тож мусить бути **поза** ним:
 * `backdrop-filter` шапки робить її контейнером для `position: fixed`. jsdom
 * його не рахує, тож перевіряється видима ознака — батько вікна в документі.
 *
 * @module packages/ui/src/nav/AppBar.share.dom.test
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_CHROME } from "./screen-chrome";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") },
}));

const { AppBarView } = await import("./AppBar");

const ACTIONS = { onBack: () => undefined, onTheme: () => undefined };
const CHROME = { ...EMPTY_CHROME, title: "PageSlay", share: { slug: "pageslay" } };

describe("вікно «Поділитись» із хедера", () => {
  it("⛔ малюється поза шапкою — інакше `fixed` контейнить її `backdrop-filter`", async () => {
    const user = userEvent.setup();
    const { container } = render(<AppBarView chrome={CHROME} {...ACTIONS} botUsername="testbot" />);

    await user.click(screen.getByRole("button", { name: "Поділитись" }));

    const dialog = await screen.findByRole("dialog", { name: "Поділитись" });
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("показує діплінк сторінки й закривається хрестиком", async () => {
    const user = userEvent.setup();
    render(<AppBarView chrome={CHROME} {...ACTIONS} botUsername="testbot" />);

    await user.click(screen.getByRole("button", { name: "Поділитись" }));
    await screen.findByAltText("QR-код посилання");

    expect(screen.getByText("https://t.me/testbot?start=pageslay")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Закрити" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Поділитись" })).toBeNull());
  });
});
