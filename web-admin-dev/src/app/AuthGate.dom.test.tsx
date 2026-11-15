// @vitest-environment jsdom
/**
 * Два входи, один гейт: без сесії — екран пароля, Сергій — уся панель,
 * Buffy — стіл. Перевіряється саме рішення гейта, а не розмітка сторінок.
 *
 * @module web-admin-dev/src/app/AuthGate.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({ side: null as "serhii" | "buffy" | null }));

vi.mock("../shared/api/auth.api", () => ({
  checkAuth: async () => auth.side,
  login: async () => undefined,
  logout: async () => undefined,
}));

const { AuthGate } = await import("./AuthGate");

describe("AuthGate", () => {
  beforeEach(() => {
    auth.side = null;
    window.history.replaceState({}, "", "/desk");
  });

  it("без сесії показує екран пароля", async () => {
    render(
      <AuthGate>
        <p>панель</p>
      </AuthGate>,
    );

    await waitFor(() => expect(screen.getByText("Увійти")).toBeTruthy());
    expect(screen.queryByText("панель")).toBeNull();
  });

  it("Сергій бачить усю панель", async () => {
    auth.side = "serhii";
    render(
      <AuthGate>
        <p>панель</p>
      </AuthGate>,
    );

    await waitFor(() => expect(screen.getByText("панель")).toBeTruthy());
  });

  it("вхід Buffy теж бачить панель — бік впливає лише на авторство", async () => {
    auth.side = "buffy";
    render(
      <AuthGate>
        <p>стіл</p>
      </AuthGate>,
    );

    await waitFor(() => expect(screen.getByText("стіл")).toBeTruthy());
  });
});
