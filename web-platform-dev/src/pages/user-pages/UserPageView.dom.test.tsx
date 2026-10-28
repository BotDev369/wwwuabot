// @vitest-environment jsdom
/**
 * Перегляд своєї сторінки — **екран, з якого сторінку показують назовні**.
 *
 * Тут ламається тихо: досить показати увімкнений перемикач до відповіді сервера —
 * і людина вважає сторінку відкритою, а вона закрита (`docs/VISIBILITY.md`);
 * досить дати адмінам кнопки доступу — і доступ роздає вже не власник
 * (`docs/SHOPS.md` §8); досить не звʼязати сітку вітрини з товарами — і на
 * власній сторінці товарів немає, хоч вони є.
 *
 * Тому перевіряється саме те, чим керує екран: слова видимості, дороги кнопок,
 * право роздавати доступ і те, що сторінка рендериться **тією самою** `page_data`,
 * що й назовні. Кирпичики (перемикач, картки, діалог) тут чужі: у кожного є свій
 * тест, і повторювати їхні правила тут означало б тримати другу правду.
 *
 * @module web-platform-dev/src/pages/user-pages/UserPageView.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pageDraft, type UserPage } from "@wwwuabot/shared/pages";
import { toWebPath } from "@wwwuabot/shared/content";
import { PAGES_PATH, shopProductEditPath, userPageEditPath } from "@/app/routes";

const navigate = vi.fn();
const dialog = { alert: vi.fn(), confirm: vi.fn(), prompt: vi.fn() };
const pagesApi = { save: vi.fn(), remove: vi.fn() };

/** Список сторінок людини: ним екран веде й себе, і сусідні рядки. */
const pages = {
  pages: [] as UserPage[],
  loading: false,
  error: null as string | null,
  upsert: vi.fn(),
  remove: vi.fn(),
};

const state = {
  page: null as UserPage | null,
  loading: false,
  error: null as string | null,
  pages,
};

const shop = {
  products: [] as unknown[],
  media: [] as unknown[],
  loading: false,
  error: null as string | null,
};

/** Хедер: те, що екран віддає йому про саму сторінку. */
let chrome: { title: string | null; share: { slug: string } | null; favorite: unknown } | null = null;
/** Контекст полотна: ним сторінка домовляється зі сіткою вітрини. */
let rendered: Record<string, unknown> | null = null;

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "7" }),
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: "/pages/7" }),
}));
vi.mock("@wwwuabot/ui/nav", () => ({
  useScreenChrome: (value: typeof chrome) => {
    chrome = value;
  },
}));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => dialog }));
vi.mock("@wwwuabot/ui/blocks", () => ({ registerAllBlocks: () => {} }));
vi.mock("@wwwuabot/ui/PageRenderer", () => ({
  PageRenderer: (props: { context: Record<string, unknown> }) => {
    rendered = props.context;
    return <div data-testid="page-renderer" />;
  },
}));
vi.mock("@/pages/shop/ShopPanel", () => ({
  ShopPanel: ({ pageId, count }: { pageId: number; count: number }) => (
    <div>{`магазин сторінки ${pageId}: товарів ${count}`}</div>
  ),
}));
vi.mock("@/pages/shop/useShopProducts", () => ({ useShopProducts: () => shop }));
vi.mock("@/shared/api/pages.api", () => ({ pagesApi }));
vi.mock("./useUserPage", () => ({ useUserPage: () => state }));

const { UserPageView } = await import("./UserPageView");

const owner: UserPage = {
  id: 7,
  slug: "pryvit",
  title: "Привіт",
  template: "card",
  values: { title: "Привіт" },
  isPublic: false,
  staff: [{ id: 1, name: "Олена", role: "owner" }],
  role: "owner",
  updatedAt: "2026-10-01 10:00:00",
};

const admin: UserPage = {
  ...owner,
  isPublic: true,
  staff: [
    { id: 1, name: "Олена", role: "owner" },
    { id: 5, name: "Ігор", role: "admin" },
  ],
  role: "admin",
};

/** Сторінка з правками: сам рядок — фікстура, а не предмет перевірки. */
const page = (over: Partial<UserPage> = {}): UserPage => ({ ...owner, ...over });

const renderView = (): void => {
  render(<UserPageView />);
};

beforeEach(() => {
  vi.clearAllMocks();
  state.page = page();
  state.loading = false;
  state.error = null;
  shop.products = [];
  shop.loading = false;
  shop.error = null;
  chrome = null;
  rendered = null;
  pagesApi.save.mockResolvedValue(page());
  dialog.confirm.mockResolvedValue(false);
});

describe("сторінки немає", () => {
  it("завантаження не прикидається, що сторінки не існує", () => {
    state.page = null;
    state.loading = true;
    renderView();

    expect(screen.getByText("Завантаження…")).toBeTruthy();
    expect(screen.queryByText("Такої сторінки немає.")).toBeNull();
  });

  it("чужого номера називає причиною, а не порожнім екраном", () => {
    state.page = null;
    state.error = "Немає доступу";
    renderView();

    expect(screen.getByText("Немає доступу")).toBeTruthy();
  });
});

describe("видимість", () => {
  it("приватна сторінка каже це словом і не кличе назовні", () => {
    renderView();

    expect(screen.getByText("Приватно · /pryvit")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Відкрити" })).toBeNull();
  });

  it("відкрита сторінка має адресу, якою її показують", async () => {
    state.page = page({ isPublic: true });
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Відкрити" }));

    expect(navigate).toHaveBeenCalledWith(toWebPath("pryvit"));
  });

  it("перемикач пише на сервер, а не малює стан сам", async () => {
    pagesApi.save.mockResolvedValue(page({ isPublic: true }));
    renderView();

    await userEvent.click(screen.getByRole("switch", { name: "Публічна сторінка" }));

    await waitFor(() => expect(pagesApi.save).toHaveBeenCalled());
    expect(pagesApi.save).toHaveBeenCalledWith({ ...pageDraft(owner), isPublic: true });
    expect(pages.upsert).toHaveBeenCalledWith(page({ isPublic: true }));
  });

  it("невдале перемикання каже причину й нічого не змінює", async () => {
    pagesApi.save.mockRejectedValue(new Error("Немає доступу"));
    renderView();

    await userEvent.click(screen.getByRole("switch", { name: "Публічна сторінка" }));

    await waitFor(() =>
      expect(dialog.alert).toHaveBeenCalledWith("Немає доступу", { title: "Помилка" }),
    );
    expect(pages.upsert).not.toHaveBeenCalled();
  });
});

describe("доступ", () => {
  it("власник бачить, хто ще тут є, і роздає доступ", async () => {
    state.page = page({
      staff: [
        { id: 1, name: "Олена", role: "owner" },
        { id: 5, name: "Ігор", role: "admin" },
      ],
    });
    renderView();

    expect(screen.getByText("Власник: Олена · Адміни: Ігор")).toBeTruthy();
    expect(screen.getByText("Ви власник — адмінів додаєте ви.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Прибрати: Ігор" })).toBeTruthy();
  });

  it("адмін бачить тих самих людей, але кнопок доступу не має", () => {
    state.page = page(admin);
    renderView();

    expect(screen.getByText("Ви адміністратор: доступом керує власник.")).toBeTruthy();
    expect(screen.getByText("Власник: Олена · Адміни: Ігор")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Додати адміна" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Прибрати: Ігор" })).toBeNull();
  });

  it("адміна додають номером, і склад адмінів не затирає видимість", async () => {
    state.page = page({ isPublic: true });
    dialog.prompt.mockResolvedValue("1049272067");
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Додати адміна" }));

    await waitFor(() => expect(pagesApi.save).toHaveBeenCalled());
    expect(pagesApi.save).toHaveBeenCalledWith({
      ...pageDraft(page({ isPublic: true })),
      admins: [1049272067],
    });
  });

  it("невірний номер діалог показує **до** запису", async () => {
    dialog.prompt.mockResolvedValue(null);
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Додати адміна" }));

    const options = dialog.prompt.mock.calls[0][1] as { validate: (raw: unknown) => string | null };
    expect(options.validate("не-номер")).not.toBeNull();
    expect(options.validate("1049272067")).toBeNull();
    expect(pagesApi.save).not.toHaveBeenCalled();
  });

  it("прибраний адмін зникає зі складу, а власник лишається", async () => {
    const withAdmins = page({
      role: "owner",
      staff: [
        { id: 1, name: "Олена", role: "owner" },
        { id: 5, name: "Ігор", role: "admin" },
      ],
    });
    state.page = withAdmins;
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Прибрати: Ігор" }));

    await waitFor(() => expect(pagesApi.save).toHaveBeenCalled());
    expect(pagesApi.save).toHaveBeenCalledWith({ ...pageDraft(withAdmins), admins: [] });
  });
});

describe("дії над сторінкою", () => {
  it("«Змінити текст» веде в сусідню адресу, а не в стан цього екрана", async () => {
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Змінити текст" }));

    expect(navigate).toHaveBeenCalledWith(userPageEditPath(7));
  });

  it("видалення питає згоду й без неї не чіпає нічого", async () => {
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Видалити" }));

    expect(dialog.confirm).toHaveBeenCalled();
    expect(pagesApi.remove).not.toHaveBeenCalled();
  });

  it("видалена сторінка йде зі списку й зі своєї адреси", async () => {
    dialog.confirm.mockResolvedValue(true);
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(pagesApi.remove).toHaveBeenCalledWith(7));
    expect(pages.remove).toHaveBeenCalledWith(7);
    expect(navigate).toHaveBeenCalledWith(PAGES_PATH, { replace: true });
  });

  it("невдале видалення каже причину й лишає сторінку на місці", async () => {
    dialog.confirm.mockResolvedValue(true);
    pagesApi.remove.mockRejectedValue(new Error("Чужа сторінка"));
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Видалити" }));

    await waitFor(() =>
      expect(dialog.alert).toHaveBeenCalledWith("Чужа сторінка", { title: "Помилка" }),
    );
    expect(pages.remove).not.toHaveBeenCalled();
  });

  it("«назад» вертає в список сторінок", async () => {
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Назад" }));

    expect(navigate).toHaveBeenCalledWith(PAGES_PATH);
  });
});

describe("сама сторінка", () => {
  it("рендериться тією ж `page_data`, а хедер знає її назву й адресу", () => {
    renderView();

    expect(screen.getByTestId("page-renderer")).toBeTruthy();
    expect(chrome).toEqual({
      title: "Привіт",
      share: null,
      favorite: { kind: "page", targetId: 7 },
    });
  });

  it("магазин питає товари окремо, а не шукає їх у тексті сторінки", () => {
    state.page = page({ template: "shop" });
    shop.products = [{ id: 3 }, { id: 4 }];
    renderView();

    expect(screen.getByText("магазин сторінки 7: товарів 2")).toBeTruthy();
    expect(rendered?.["shopCards"]).toEqual([]);
  });

  it("плитка товару веде в правку цього товару", () => {
    state.page = page({ template: "shop" });
    renderView();

    (rendered?.["shopEditProduct"] as (id: number) => void)(3);

    expect(navigate).toHaveBeenCalledWith(shopProductEditPath(7, 3));
  });

  it("не магазин не має ні картки товарів, ні сітки вітрини", () => {
    renderView();

    expect(screen.queryByText(/магазин сторінки/)).toBeNull();
    expect(rendered?.["shopCards"]).toBeUndefined();
    expect(rendered?.["shopEditProduct"]).toBeUndefined();
  });
});
