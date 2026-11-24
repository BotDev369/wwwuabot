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
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
// `apiUpload` — сусід у тому ж клієнті: без нього смуга не імпортується взагалі.
vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request, apiUpload: vi.fn() }));

const { PlatformShell } = await import("./PlatformShell");
const { EntryPage } = await import("@/pages/entry/EntryPage");
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

/** Вітрина входу — та сама оболонка, а не окремий каркас без хедера. */
function renderEntry(): void {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<PlatformShell />}>
          <Route index element={<EntryPage />} />
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
  delete window.Telegram;
  document.documentElement.removeAttribute("data-chrome");
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
    // Хедер малюється каркасом: крохи з реєстру ще до відповіді `/api/screens`.
    expect(document.querySelector(".wb-appbar__trail")?.textContent).toBe("Трекери");
    expect(screen.getByRole("button", { name: "Меню" })).toBeTruthy();
    // Верхівка екрана — назва й підпис на кольорі шапки, одна на всі екрани.
    expect(document.querySelector(".wb-screen-head__title")?.textContent).toBe("Трекери");
    expect(document.querySelector(".wb-screen-head__lead")?.textContent).toBe(
      "Мірки й записи: що рахуєте, те й бачите",
    );
    // Тон розділу каркас публікує на `<html>`: звідти його бере нативна шапка.
    expect(document.documentElement.getAttribute("data-tone")).toBe("2");
    // Тема — кругла кнопка в меню, а не перемикач у хедері.
    expect(screen.getByRole("button", { name: /^Тема: / })).toBeTruthy();
    expect(document.querySelector(".wb-platform")).not.toBeNull();
  });

  it("вітрина `/` живе в тому самому каркасі, але без крошок і бренду в хедері", () => {
    renderEntry();

    expect(screen.getByRole("heading", { name: "ПАЛЯНИЦЯ" })).toBeTruthy();
    expect(screen.getByText("платформа для своїх")).toBeTruthy();
    // Назва продукту — на обкладинці; у хедері вона не дублюється.
    expect(screen.getAllByText("ПАЛЯНИЦЯ")).toHaveLength(1);
    expect(document.querySelector(".wb-appbar__brand-name")).toBeNull();
    expect(document.querySelector(".wb-appbar__trail")).toBeNull();
    // Нашого хедера на обкладинці немає зовсім: вона впирається в самий верх,
    // а рідний хедер Telegram фарбується кольором графіки.
    expect(document.querySelector(".wb-appbar")).toBeNull();
    expect(screen.queryByRole("button", { name: "Меню" })).toBeNull();
    expect(document.documentElement.getAttribute("data-chrome")).toBe("hero");
    // У розділу тону немає — обкладинка фарбує хром сама.
    expect(document.documentElement.getAttribute("data-tone")).toBeNull();
  });

  it("на головній виходить із повного екрана і ховає «←» — клієнт малює «✕»", () => {
    const show = vi.fn();
    const hide = vi.fn();
    const onClick = vi.fn();
    const exitFullscreen = vi.fn();
    const requestFullscreen = vi.fn();
    window.Telegram = {
      WebApp: {
        exitFullscreen,
        requestFullscreen,
        BackButton: { show, hide, onClick, offClick: vi.fn() },
      },
    };

    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<PlatformShell />}>
            <Route index element={<EntryPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(exitFullscreen).toHaveBeenCalled();
    expect(requestFullscreen).not.toHaveBeenCalled();
    // Історії в кореня немає: «назад» там нема куди — лишається закрити.
    expect(hide).toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    view.unmount();
    delete window.Telegram;
  });

  it("на внутрішньому екрані не входить у повний екран, а «назад» веде в історію", () => {
    const show = vi.fn();
    const onClick = vi.fn();
    const exitFullscreen = vi.fn();
    const requestFullscreen = vi.fn();
    window.Telegram = {
      WebApp: {
        exitFullscreen,
        requestFullscreen,
        BackButton: { show, hide: vi.fn(), onClick, offClick: vi.fn() },
      },
    };

    renderShell();

    // Рідна шапка клієнта лишається — як на головній: повного екрана немає.
    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(exitFullscreen).toHaveBeenCalled();
    // Системна «назад» мусить вести в історію, а не закривати застосунок.
    expect(show).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();
    delete window.Telegram;
  });

  it("підсвічує пункт, у якому людина стоїть", async () => {
    renderShell();

    // `/trackers` — тепер звичайний пункт спільного списку: він мусить бути
    // поточним, а не просто існувати.
    const current = await screen.findByRole("link", { name: /Трекери/ });
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("тримає фокус у меню й повертає його на кнопку після закриття", async () => {
    renderShell();

    const button = await screen.findByRole("button", { name: "Меню" });
    button.focus();
    fireEvent.click(button);

    // Фокус пішов у меню: сторінка під ним `inert`.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Закрити меню" }));

    fireEvent.click(screen.getByRole("button", { name: "Закрити меню" }));
    await waitFor(() => expect(document.activeElement).toBe(button));
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
