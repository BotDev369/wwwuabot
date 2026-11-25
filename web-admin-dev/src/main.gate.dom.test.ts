// @vitest-environment jsdom
/**
 * Гейт першого кадру вирішує, чи малювати адмінку в цьому вікні.
 *
 * @module web-admin-dev/src/main.gate.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WEB_BLOCK_ATTR } from "@wwwuabot/shared/security/mini-app";

const mocks = vi.hoisted(() => ({
  createRoot: vi.fn(),
  render: vi.fn(),
  initTheme: vi.fn(),
}));

vi.mock("react-dom/client", () => ({ createRoot: mocks.createRoot }));
vi.mock("@wwwuabot/shared", () => ({
  initTheme: mocks.initTheme,
  reloadOnNewBuild: vi.fn(),
}));
vi.mock("@wwwuabot/ui/dialog", () => ({
  DialogProvider: ({ children }: { children: unknown }) => children,
}));
vi.mock("./App.tsx", () => ({ default: () => null }));

/** Запуск `main.tsx` з нуля: модуль виконується на імпорті. */
async function boot(): Promise<void> {
  vi.resetModules();
  await import("./main");
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createRoot.mockReturnValue({ render: mocks.render });
  document.documentElement.removeAttribute(WEB_BLOCK_ATTR);
});

describe("вхід в адмінку", () => {
  it("у вебі панель не малюється", async () => {
    document.documentElement.setAttribute(WEB_BLOCK_ATTR, "");
    await boot();

    expect(mocks.createRoot).not.toHaveBeenCalled();
    expect(mocks.initTheme).not.toHaveBeenCalled();
  });

  it("у Mini App панель малюється", async () => {
    await boot();

    expect(mocks.initTheme).toHaveBeenCalled();
    expect(mocks.createRoot).toHaveBeenCalledTimes(1);
    expect(mocks.render).toHaveBeenCalledTimes(1);
  });
});
