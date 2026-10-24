// @vitest-environment jsdom
/**
 * Нова збірка — перезавантаження: вкладка не має лишатися на старому коді, бо
 * саме так у журналі замість «Дотик» видно службовий ключ.
 *
 * @module @wwwuabot/shared/app/watch-build.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildStamp, watchBuild } from "./watch-build";

function withStamp(stamp: string): void {
  document.head.innerHTML = `<meta name="x-build" content="${stamp}" />`;
}

beforeEach(() => {
  document.head.innerHTML = "";
});

describe("мітка збірки", () => {
  it("читається з index.html", () => {
    expect(buildStamp('<meta name="x-build" content="abc123">')).toBe("abc123");
  });

  it("без мітки — `null`, а не порожній рядок", () => {
    expect(buildStamp("<html><head></head></html>")).toBeNull();
  });
});

describe("перевірка нової збірки", () => {
  it("зміна мітки на сервері кличе перезавантаження", async () => {
    withStamp("old");
    const reload = vi.fn();
    watchBuild(reload, {
      enabled: true,
      load: async () => '<meta name="x-build" content="new">',
    });

    document.dispatchEvent(new Event("visibilitychange"));

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it("та сама мітка — нічого не робить", async () => {
    withStamp("same");
    const reload = vi.fn();
    watchBuild(reload, {
      enabled: true,
      load: async () => '<meta name="x-build" content="same">',
    });

    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    expect(reload).not.toHaveBeenCalled();
  });

  it("поза зібраною версією або без мітки не стежить узагалі", () => {
    const load = vi.fn(async () => "");
    watchBuild(vi.fn(), { enabled: false, load });
    expect(load).not.toHaveBeenCalled();

    withStamp("");
    watchBuild(vi.fn(), { enabled: true, load });
    expect(load).not.toHaveBeenCalled();
  });

  it("мережа відмовила — вкладка лишається на місці", async () => {
    withStamp("old");
    const reload = vi.fn();
    watchBuild(reload, {
      enabled: true,
      load: async () => {
        throw new Error("offline");
      },
    });

    document.dispatchEvent(new Event("visibilitychange"));

    await Promise.resolve();
    expect(reload).not.toHaveBeenCalled();
  });
});
