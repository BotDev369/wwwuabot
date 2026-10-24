// @vitest-environment jsdom
/**
 * Модалка — окрема подія: вона не має адреси, тож єдине, що її описує, —
 * назва в шапці («Товари», «Кошик», «Тема»).
 *
 * @module web-platform-dev/src/layout/useModalLog.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request, apiUpload: vi.fn() }));

const { useModalLog } = await import("./useModalLog");
const { useActionLog } = await import("./useActionLog");

function Harness(): React.ReactElement {
  useModalLog();
  // Дотик тримає `useActionLog` — саме він скасовується й віддає свій підпис
  // поверхні, яку натискання відкрило.
  useActionLog();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Товари</button>
      {open && (
        <div className="wb-modal-overlay">
          <div className="wb-modal" role="dialog" aria-modal="true" aria-label="Товари">
            <h2 className="wb-modal-title">Товари</h2>
          </div>
        </div>
      )}
    </>
  );
}

function reported(): unknown[] {
  return mocks.request.mock.calls.map(([, init]) =>
    JSON.parse((init as RequestInit).body as string),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockResolvedValue({ ok: true });
});

describe("відкрита поверхня", () => {
  it("пишеться назвою з шапки й сторінкою, з якої її відкрили", async () => {
    render(
      <MemoryRouter initialEntries={["/services"]}>
        <Harness />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Товари" }));

    await waitFor(() =>
      expect(reported()).toEqual([{ kind: "modal", screen: "services", title: "Товари" }]),
    );
  });

  it("загальна шапка не забирає назву в натиснутого контрола", async () => {
    function Composer(): React.ReactElement {
      useModalLog();
      useActionLog();
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Створити нотатку</button>
          {open && (
            <div role="dialog" aria-label="Створити">
              <h2 className="wb-modal-title">Створити</h2>
            </div>
          )}
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={["/notes"]}>
        <Composer />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Створити нотатку" }));

    await waitFor(() =>
      expect(reported()).toEqual([{ kind: "modal", screen: "notes", title: "Створити нотатку" }]),
    );
  });

  it("поверхня без назви й без натискання не пише порожній рядок", async () => {
    function Nameless(): React.ReactElement {
      useModalLog();
      const [open, setOpen] = useState(false);
      // Відкрито кодом, а не людиною: підпису немає звідки взяти.
      useEffect(() => {
        const timer = setTimeout(() => setOpen(true), 10);
        return () => clearTimeout(timer);
      }, []);
      return <>{open && <div role="dialog" aria-modal="true" />}</>;
    }

    render(
      <MemoryRouter initialEntries={["/services"]}>
        <Nameless />
      </MemoryRouter>,
    );
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(mocks.request).not.toHaveBeenCalled();
  });
});
