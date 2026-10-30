// @vitest-environment jsdom
/**
 * Сторінка сценарію: номер із API стає числом — на нього спираються і ціль
 * лайка, і адреса хедера, тож рядок тут ламає серце вже після натискання.
 *
 * Перевіряється те, чим екран керує: що з відповіді йде в хедер, коли видно
 * фолбек і коли під сторінкою кличуть магазин (блоки — чужі, у них свій тест).
 * @module web-platform-dev/src/pages/ScenarioPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { PageConfig } from "@wwwuabot/shared/types/page-config";
import { HOME_SLUG } from "@wwwuabot/shared/content";

/** Те, що екран сказав хедеру про сторінку. */
let chrome: { title: string | null; share: { slug: string } | null; favorite: unknown } | null =
  null;
/** Те, що дійшло до рендерера: конфігурація сторінки і контекст блоків. */
let rendered: { config: PageConfig; context: Record<string, unknown> } | null = null;
let params: Record<string, string> = { "*": "pageslay" };
let pathname = "/pageslay";

/** Відповідь API за адресою: `ok` — статус, `fail` — мережа не відповіла зовсім. */
interface Reply {
  ok?: boolean;
  body?: unknown;
  fail?: boolean;
}
const replies = new Map<string, Reply>();
let profile: Reply = { fail: true };

const apiFetchRaw = vi.fn();
const navigate = vi.fn();
const catalog = { products: [] as unknown[], media: [] as unknown[], loading: false };

vi.mock("react-router-dom", () => ({
  useParams: () => params,
  useLocation: () => ({ pathname }),
  useNavigate: () => navigate,
}));
vi.mock("@wwwuabot/ui/nav", () => ({
  useScreenChrome: (value: typeof chrome) => {
    chrome = value;
  },
}));
vi.mock("@wwwuabot/ui/blocks", () => ({ registerAllBlocks: () => {} }));
vi.mock("@wwwuabot/ui/PageRenderer", () => ({
  PageRenderer: (props: { config: PageConfig; context: Record<string, unknown> }) => {
    rendered = { config: props.config, context: props.context };
    return <div data-testid="page-renderer" />;
  },
}));
vi.mock("@/pages/shop/store/ShopStore", () => ({
  ShopStore: ({ slug, products }: { slug: string; products: unknown[] }) => (
    <div data-testid="store">{`вітрина ${slug}: товарів ${products.length}`}</div>
  ),
}));
vi.mock("@/pages/shop/useShopCatalog", () => ({ useShopCatalog: () => catalog }));
vi.mock("@/shared/api/client", () => ({
  apiFetchRaw: (url: string) => apiFetchRaw(url),
}));

const { ScenarioPage } = await import("./ScenarioPage");

apiFetchRaw.mockImplementation(async (url: string) => {
  if (url === "/api/user/profile") return respond(profile);
  const reply = replies.get(url);
  if (!reply) throw new Error(`несподіваний запит: ${url}`);
  return respond(reply);
});

function respond(reply: Reply) {
  if (reply.fail) throw new Error("мережа недоступна");
  return { ok: reply.ok ?? true, json: async () => reply.body ?? {} };
}

const PAGE_URL = "/api/scenario/pageslay";

const pageData: PageConfig = {
  version: 1,
  zones: {
    header: [],
    sidebar: [],
    main: [{ id: "b1", type: "text", order: 0, props: { content: "Привіт" } }],
    footer: [],
  },
};

/** Відповідь на запит сторінки; `ok: false` — статус, решта — тіло. */
const answer = (body: unknown, ok = true, url = PAGE_URL): void => {
  replies.set(url, { ok, body });
};

/** Заголовок фолбеку — єдиний дозволений хардкод на цьому екрані. */
const fallbackTitle = (): unknown => rendered?.config.zones.main[0]?.props?.["title"];

beforeEach(() => {
  vi.clearAllMocks();
  chrome = null;
  rendered = null;
  replies.clear();
  profile = { fail: true };
  catalog.products = [];
  catalog.loading = false;
  params = { "*": "pageslay" };
  pathname = "/pageslay";
});

describe("відповідь API → хедер", () => {
  it("номер сторінки приходить рядком, а хедер отримує число", async () => {
    answer({
      ok: true,
      scenario: {
        id: "34",
        slug: "pageslay",
        title: "PageSlay",
        photo_url: "https://cdn.example/photo.jpg",
      },
      pageData: JSON.stringify(pageData),
    });

    render(<ScenarioPage />);
    expect(screen.getByText("Завантаження…")).toBeTruthy();

    await waitFor(() => expect(chrome?.favorite).toEqual({ kind: "page", targetId: 34 }));
    expect(chrome).toEqual({
      title: "PageSlay",
      share: { slug: "pageslay" },
      favorite: { kind: "page", targetId: 34 },
    });
    expect(rendered?.config).toEqual(pageData);
    expect(rendered?.context).toMatchObject({
      slug: "pageslay",
      title: "PageSlay",
      photoUrl: "https://cdn.example/photo.jpg",
      isOwner: false,
    });
  });

  it("адреса в номері не стає ціллю лайка", async () => {
    answer({
      ok: true,
      scenario: { id: "pageslay", title: "PageSlay" },
      pageData,
    });

    render(<ScenarioPage />);

    await waitFor(() => expect(rendered?.context.slug).toBe("pageslay"));
    expect(chrome).toEqual({ title: "PageSlay", share: null, favorite: null });
  });

  it("профіль власника робить контекст контекстом власника", async () => {
    profile = { body: { ok: true, user: { role: "owner", name: "Олена" } } };
    answer({ ok: true, scenario: { id: 7, slug: "pageslay", title: "PageSlay" }, pageData });

    render(<ScenarioPage />);

    await waitFor(() => expect(rendered?.context.isOwner).toBe(true));
    expect(rendered?.context.user).toEqual({ role: "owner", name: "Олена" });
    expect(chrome?.favorite).toEqual({ kind: "page", targetId: 7 });
  });

  it("головна адреса питає сценарій головної, а не порожній шлях", async () => {
    params = {};
    pathname = "/";
    const url = `/api/scenario/${encodeURIComponent(HOME_SLUG)}`;
    replies.set(url, { body: { ok: true, scenario: { id: "1" }, pageData } });

    render(<ScenarioPage />);

    await waitFor(() => expect(apiFetchRaw).toHaveBeenCalledWith(url));
    expect(rendered?.context.slug).toBe(HOME_SLUG);
    expect(chrome).toEqual({
      title: null,
      share: { slug: "" },
      favorite: { kind: "page", targetId: 1 },
    });
  });
});

describe("чого сторінки немає", () => {
  it("статус не 200 показує фолбек, а не порожній екран", async () => {
    answer(null, false);

    render(<ScenarioPage />);

    await waitFor(() => expect(fallbackTitle()).toBe("Сторінка тимчасово недоступна"));
    expect(rendered?.context).toEqual({ slug: HOME_SLUG, title: null, photoUrl: null });
    expect(chrome).toEqual({ title: null, share: null, favorite: null });
  });

  it("сценарій без `page_data` — теж фолбек, а не порожня сторінка", async () => {
    answer({ ok: true, scenario: { id: "34", slug: "pageslay", title: "PageSlay" } });

    render(<ScenarioPage />);

    await waitFor(() => expect(fallbackTitle()).toBe("Сторінка тимчасово недоступна"));
  });

  it("відповідь `ok: false` у тілі не показує сторінку", async () => {
    answer({ ok: false });

    render(<ScenarioPage />);

    await waitFor(() => expect(fallbackTitle()).toBe("Сторінка тимчасово недоступна"));
  });

  it("мережа, що впала, не лишає екран порожнім", async () => {
    replies.set(PAGE_URL, { fail: true });

    render(<ScenarioPage />);

    await waitFor(() => expect(fallbackTitle()).toBe("Сторінка тимчасово недоступна"));
  });
});

describe("магазин", () => {
  it("сторінку з шаблоном магазину малює вітрина, і товари приходять їй окремо", async () => {
    catalog.products = [{ id: 3 }, { id: 4 }];
    params = { "*": "kram" };
    pathname = "/kram";
    answer(
      {
        ok: true,
        scenario: { id: "9", slug: "kram", title: "Крам", template_key: "shop" },
        pageData,
      },
      true,
      "/api/scenario/kram",
    );

    render(<ScenarioPage />);

    await waitFor(() => expect(screen.getByTestId("store")).toBeTruthy());
    expect(screen.getByText("вітрина kram: товарів 2")).toBeTruthy();
    expect(screen.queryByTestId("page-renderer")).toBeNull();
  });
});
