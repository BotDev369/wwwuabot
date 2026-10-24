// @vitest-environment jsdom
/**
 * «Відкрив екран»: ключ береться з адреси, а не з мережі — журнал бачить
 * екран людини, а не запити, які екран зробив сам. Повторний той самий екран
 * не рахується, а невдалий звіт не ламає навігацію.
 *
 * @module web-platform-dev/src/layout/usePlatformViews.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { ScreenChromeProvider, useScreenChrome } from "@wwwuabot/ui/nav";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request }));

const { usePlatformViews } = await import("./usePlatformViews");

function Harness(): React.ReactElement {
  usePlatformViews();
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate("/favorites")}>до обраного</button>
      <button onClick={() => navigate("/trackers/")}>до трекерів із хвостом</button>
    </>
  );
}

/** Назва сторінки приходить із хедера — його тут замінює один виклик. */
function Title(): null {
  useScreenChrome({ title: "Трекери" });
  return null;
}

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ScreenChromeProvider>
        <Title />
        <Harness />
      </ScreenChromeProvider>
    </MemoryRouter>,
  );
}

/** Тіло звіту — один ключ екрана; адреса й метод важливі так само. */
function reportedScreens(): string[] {
  return mocks.request.mock.calls.map(
    ([, init]) => JSON.parse((init as RequestInit).body as string).screen,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockResolvedValue({ ok: true });
});

describe("що бачить журнал", () => {
  it("надсилає ключ екрана, а не адресу запиту", async () => {
    renderAt("/trackers");

    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
    expect(mocks.request).toHaveBeenCalledWith(
      "/api/user/event",
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
    // Назва з шапки — те, що людина бачить; без неї всі детальні сторінки
    // виглядали б одним ключем розділу.
    expect(JSON.parse(mocks.request.mock.calls[0]?.[1].body as string)).toMatchObject({
      screen: "trackers",
      title: "Трекери",
    });
    expect(reportedScreens()).toEqual(["trackers"]);
  });

  it("перехід на інший екран — новий рядок", async () => {
    renderAt("/notes");
    await waitFor(() => expect(reportedScreens()).toEqual(["notes"]));

    fireEvent.click(screen.getByText("до обраного"));

    await waitFor(() => expect(reportedScreens()).toEqual(["notes", "favorites"]));
  });

  it("той самий екран підряд не рахується двічі", async () => {
    renderAt("/trackers");
    await waitFor(() => expect(reportedScreens()).toEqual(["trackers"]));

    // Хвіст слеша — та сама адреса, тож це не новий перехід.
    fireEvent.click(screen.getByText("до трекерів із хвостом"));

    expect(reportedScreens()).toEqual(["trackers"]);
  });
});

describe("збій звіту", () => {
  it("не ламає навігацію", async () => {
    mocks.request.mockRejectedValue(new Error("HTTP 500"));
    renderAt("/notes");
    await waitFor(() => expect(mocks.request).toHaveBeenCalled());

    fireEvent.click(screen.getByText("до обраного"));

    await waitFor(() => expect(reportedScreens()).toEqual(["notes", "favorites"]));
  });
});
