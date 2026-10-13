// @vitest-environment jsdom
/**
 * Футер платформи: **самі знаки**, активний один, бейдж — на «Акаунті».
 *
 * Перевіряється те, що легко зламати мовчки: підписів під іконками немає
 * (вони лишаються в `aria-label`), активний пункт рівно один, а число
 * непрочитаних стоїть на тому слоті, який його носить.
 *
 * @module web-platform-dev/src/layout/PlatformTabBar.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hooks = { unread: 0, dialog: { alert: vi.fn() } };

vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => hooks.dialog }));
vi.mock("./useUnreadBadge", () => ({ useUnreadBadge: () => hooks.unread }));

const { PlatformTabBar } = await import("./PlatformTabBar");

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PlatformTabBar />
    </MemoryRouter>,
  );
}

/** Смуга футера — навігація зі своїм підписом для скрінрідера. */
function bar(): HTMLElement {
  return screen.getByRole("navigation", { name: "Навігація платформи" });
}

function slots(): HTMLElement[] {
  return [...bar().querySelectorAll("a, button")] as HTMLElement[];
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.unread = 0;
});

describe("футер платформи", () => {
  it("три слоти, і жодного видимого підпису під знаком", () => {
    renderAt("/services");

    expect(slots()).toHaveLength(3);
    for (const slot of slots()) {
      expect(slot.querySelector(".wb-tabbar-label")).toBeNull();
      expect(slot.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("активний рівно один — і це «Сервіси»", () => {
    renderAt("/services");

    const active = slots().filter((slot) => slot.getAttribute("aria-current") === "page");
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute("aria-label")).toBe("Сервіси");
  });

  it("акаунт підсвічується на власних екранах людини", () => {
    renderAt("/account");

    const active = slots().filter((slot) => slot.getAttribute("aria-current") === "page");
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute("aria-label")).toBe("Акаунт");
  });

  it("число непрочитаних стоїть на «Акаунті», а не на інших слотах", () => {
    hooks.unread = 4;
    renderAt("/services");

    const withBadge = slots().filter((slot) => slot.querySelector(".wb-tabbar-badge"));
    expect(withBadge).toHaveLength(1);
    expect(withBadge[0].getAttribute("aria-label")).toBe("Акаунт");
    expect(withBadge[0].textContent).toContain("4");
  });
});
