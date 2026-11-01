// @vitest-environment jsdom
/**
 * «Замовлення» — перелік магазинів, які людина веде, а не другий список замовлень.
 *
 * Тест тримає те, що ламається мовчки: фільтр за шаблоном (сторінка-не-магазин
 * у списку була б входом у порожнечу), підпис ролі (власник і адмін — різні
 * права) і перехід саме в замовлення магазину.
 *
 * @module web-platform-dev/src/pages/ProfileOrdersPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserPage } from "@wwwuabot/shared/pages";
import { shopOrdersPath } from "@/app/routes";

interface State {
  pages: UserPage[];
  loading: boolean;
  error: string | null;
  upsert: () => void;
  remove: () => void;
}

const hooks = {
  navigate: vi.fn(),
  state: { pages: [], loading: false, error: null, upsert: () => {}, remove: () => {} } as State,
};

vi.mock("react-router-dom", () => ({ useNavigate: () => hooks.navigate }));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@/pages/user-pages/useUserPages", () => ({ useUserPages: () => hooks.state }));

const { ProfileOrdersPage } = await import("./ProfileOrdersPage");

const page = (fields: Record<string, unknown>): UserPage => fields as unknown as UserPage;

const shop = (id: number, title: string, role: "owner" | "admin"): UserPage =>
  page({ id, title, template: "shop", role });

const show = (over: Partial<State>): void => {
  hooks.state = { pages: [], loading: false, error: null, upsert: () => {}, remove: () => {} };
  Object.assign(hooks.state, over);
};

beforeEach(() => {
  vi.clearAllMocks();
  show({});
});

describe("екран «Замовлення»", () => {
  it("показує лише магазини — сторінка іншого шаблону сюди не потрапляє", () => {
    show({
      pages: [shop(7, "Крамниця", "owner"), page({ id: 9, title: "Візитка", template: "page" })],
    });
    render(<ProfileOrdersPage />);

    expect(screen.getByText("Крамниця")).toBeTruthy();
    expect(screen.queryByText("Візитка")).toBeNull();
  });

  it("каже роль словом: власник і адміністратор — різні права", () => {
    show({ pages: [shop(7, "Крамниця", "owner"), shop(8, "Салон", "admin")] });
    render(<ProfileOrdersPage />);

    expect(screen.getByText("Ви власник")).toBeTruthy();
    expect(screen.getByText("Ви адміністратор")).toBeTruthy();
  });

  it("дотик веде в замовлення саме цього магазину", async () => {
    show({ pages: [shop(7, "Крамниця", "owner")] });
    render(<ProfileOrdersPage />);

    await userEvent.click(screen.getByRole("button", { name: /Крамниця/ }));

    expect(hooks.navigate).toHaveBeenCalledWith(shopOrdersPath(7));
  });

  it("порожній екран каже, звідки береться магазин", () => {
    render(<ProfileOrdersPage />);

    expect(screen.getByText("Магазинів у вас немає.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("помилку показує текстом, а не порожнім списком", () => {
    show({ error: "Немає зв'язку" });
    render(<ProfileOrdersPage />);

    expect(screen.getByText("Немає зв'язку")).toBeTruthy();
    expect(screen.queryByText("Магазинів у вас немає.")).toBeNull();
  });

  it("під час завантаження не показує ні списку, ні «немає магазинів»", () => {
    show({ loading: true });
    render(<ProfileOrdersPage />);

    expect(screen.getByText("Завантаження…")).toBeTruthy();
    expect(screen.queryByText("Магазинів у вас немає.")).toBeNull();
  });
});
