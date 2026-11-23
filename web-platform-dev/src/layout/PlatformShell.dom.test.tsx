// @vitest-environment jsdom
/**
 * Каркас платформи: хедер і сайдбар стоять **поза** сторінкою, тож вони є на
 * кожному екрані тим самим кодом, а не копією в кожній сторінці.
 *
 * Журнал при цьому отримує один рядок «відкрив екран» — з каркаса, бо саме він
 * знає, що перехід стався.
 *
 * @module web-platform-dev/src/layout/PlatformShell.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
// `apiUpload` — сусід у тому ж клієнті: без нього смуга не імпортується взагалі.
vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request, apiUpload: vi.fn() }));

const { PlatformShell } = await import("./PlatformShell");
const { useScreenChrome } = await import("@wwwuabot/ui/nav");

/** Екран, як справжній: він сам каже хедеру свою назву. */
function TrackerScreen(): React.ReactElement {
  useScreenChrome({ title: "Трекери" });
  return <p>екран трекерів</p>;
}

function renderShell(): void {
  render(
    <MemoryRouter initialEntries={["/trackers"]}>
      <Routes>
        <Route element={<PlatformShell />}>
          <Route path="*" element={<TrackerScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** Реєстр у тесті: каркас бере з нього назву, крохи й пункти меню. */
const SCREENS = [
  {
    key: "trackers",
    parentKey: null,
    title: "Трекери",
    icon: "bar-chart",
    sortOrder: 10,
    inMenu: true,
    texts: {},
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockImplementation(async (url: string) => {
    if (url === "/api/screens") return { ok: true, screens: SCREENS };
    if (url === "/api/messages/badge") return 0;
    return { ok: true };
  });
});

describe("каркас", () => {
  it("тримає хедер і навігацію навколо сторінки", async () => {
    renderShell();

    expect(screen.getByText("екран трекерів")).toBeTruthy();
    expect(screen.getByLabelText("Навігація платформи")).toBeTruthy();
    // Хедер малюється каркасом і на всіх екранах показує той самий бренд.
    expect(screen.getByText("ПАЛЯНИЦЯ")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Меню" })).toBeTruthy();
    // Тема — перший пункт меню, а не кнопка в хедері.
    expect(screen.getByRole("switch", { name: "Тема" })).toBeTruthy();
    expect(document.querySelector(".wb-platform")).not.toBeNull();
  });

  it("підсвічує пункт, у якому людина стоїть", async () => {
    renderShell();

    // `/trackers` — тепер звичайний пункт спільного списку: він мусить бути
    // поточним, а не просто існувати.
    const current = await screen.findByRole("link", { name: /Трекери/ });
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("каже журналу, що людина відкрила екран", async () => {
    renderShell();

    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        "/api/user/event",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(screen.getByText("екран трекерів")).toBeTruthy();
  });
});
