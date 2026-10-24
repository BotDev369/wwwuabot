// @vitest-environment jsdom
/**
 * Каркас платформи: хедер і футер стоять **поза** сторінкою, тож вони є на
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockImplementation(async (url: string) =>
    url === "/api/messages/badge" ? 0 : { ok: true },
  );
});

describe("каркас", () => {
  it("тримає хедер і футер навколо сторінки", async () => {
    renderShell();

    expect(screen.getByText("екран трекерів")).toBeTruthy();
    expect(screen.getByLabelText("Навігація платформи")).toBeTruthy();
    // Хедер малюється каркасом; без `useScreenChrome` він порожній, і сторінка
    // все одно на місці — саме тому він стоїть тут, а не в кожному екрані.
    expect(document.querySelector(".wb-tabbar-layout")).not.toBeNull();
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
