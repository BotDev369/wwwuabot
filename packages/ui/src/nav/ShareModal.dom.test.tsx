// @vitest-environment jsdom
/**
 * «Поділитись»: що людина реально отримує в руки.
 *
 * Перевіряється не розмітка, а **адреса**: діплінк, коли ім'я бота відоме, і
 * веб-адреса, коли ні — бо саме вона їде в чат і саме вона ламається мовчки
 * (Telegram обрізає задовгий `?start=` без помилки).
 *
 * @module packages/ui/src/nav/ShareModal.dom.test
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ShareTarget } from "./screen-chrome";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") },
}));

const { ShareModal } = await import("./ShareModal");

const GALLERY: ShareTarget = { slug: "gallery" };

/**
 * Рендер із дочікуванням QR: його адреса приходить промісом, і без очікування
 * оновлення стану падає поза `act`.
 */
async function renderShare(share: ShareTarget, botUsername: string | null): Promise<void> {
  render(<ShareModal share={share} botUsername={botUsername} onClose={() => undefined} />);
  await screen.findByAltText("QR-код посилання");
}

describe("посилання у вікні «Поділитись»", () => {
  it("ім'я бота відоме — показує діплінк, а не веб-шлях", async () => {
    await renderShare(GALLERY, "testbot");

    expect(screen.getByText("https://t.me/testbot?start=gallery")).toBeTruthy();
  });

  it("ім'я бота з `@` не ламає посилання", async () => {
    await renderShare(GALLERY, "@testbot");

    expect(screen.getByText("https://t.me/testbot?start=gallery")).toBeTruthy();
  });

  it("⛔ без імені бота показує веб-адресу — її теж можна передати", async () => {
    await renderShare(GALLERY, null);

    expect(screen.getByText(`${window.location.origin}/gallery`)).toBeTruthy();
  });

  it("головна сторінка — посилання на бота без параметра", async () => {
    await renderShare({ slug: "" }, "testbot");

    expect(screen.getByText("https://t.me/testbot")).toBeTruthy();
  });

  it("передає посилання в месенджери закодованим", async () => {
    await renderShare(GALLERY, "testbot");

    const url = encodeURIComponent("https://t.me/testbot?start=gallery");
    expect(screen.getByRole("link", { name: "Telegram" }).getAttribute("href")).toBe(
      `https://t.me/share/url?url=${url}`,
    );
    expect(screen.getByRole("link", { name: "WhatsApp" }).getAttribute("href")).toBe(
      `https://wa.me/?text=${url}`,
    );
  });

  it("копіювання кладе саме посилання і показує, що вийшло", async () => {
    const user = userEvent.setup();
    await renderShare(GALLERY, "testbot");

    await user.click(screen.getByRole("button", { name: "Копіювати посилання" }));

    // `userEvent` дає власний стаб буфера — читаємо з нього, а не з мока.
    await expect(navigator.clipboard.readText()).resolves.toBe(
      "https://t.me/testbot?start=gallery",
    );
    await screen.findByRole("button", { name: "Скопійовано" });
  });

  it("малює QR-код того самого посилання", async () => {
    await renderShare(GALLERY, "testbot");

    const qr = screen.getByAltText("QR-код посилання");
    await waitFor(() => expect(qr.getAttribute("src")).toBe("data:image/png;base64,qr"));
  });
});
