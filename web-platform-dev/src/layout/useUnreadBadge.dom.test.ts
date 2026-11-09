// @vitest-environment jsdom
/**
 * Бейдж непрочитаного: крок опитування відступає, поки число не змінюється, і
 * повертається до базового на зміну числа, на сигнал і на повернення видимості.
 *
 * Числа тут — не магія, а обіцянка: 25 с базово, стеля 90 с, і жодного запиту,
 * поки екран невидимий.
 *
 * @module web-platform-dev/src/layout/useUnreadBadge.dom.test
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  badge: vi.fn<() => Promise<number>>(),
  listeners: new Set<() => void>(),
}));

vi.mock("@/shared/api/messages.api", () => ({ messagesApi: { badge: mocks.badge } }));

vi.mock("@wwwuabot/shared/messages", () => ({
  onUnreadChanged: (listener: () => void) => {
    mocks.listeners.add(listener);
    return () => {
      mocks.listeners.delete(listener);
    };
  },
}));

const { BADGE_POLL_MAX_MS, BADGE_POLL_MS, useUnreadBadge } = await import("./useUnreadBadge");

/** Скільки разів питали сервер. */
function polls(): number {
  return mocks.badge.mock.calls.length;
}

async function wait(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Сигнал «переписку змінили» — так його чує хук. */
function signal(): void {
  for (const listener of [...mocks.listeners]) listener();
}

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  mocks.badge.mockReset();
  mocks.badge.mockResolvedValue(0);
  mocks.listeners.clear();
  vi.useFakeTimers();
  setHidden(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("опитування бейджа", () => {
  it("питає зразу, а далі — базовим кроком", async () => {
    renderHook(() => useUnreadBadge());

    expect(polls()).toBe(1);

    await wait(BADGE_POLL_MS - 1);
    expect(polls()).toBe(1);

    await wait(1);
    expect(polls()).toBe(2);
  });

  it("відступає, поки число не змінюється, і спиняється на стелі", async () => {
    renderHook(() => useUnreadBadge());

    await wait(BADGE_POLL_MS);
    expect(polls()).toBe(2);

    // Другий крок — 40 с, а не знову 25: 25 уже минуло.
    await wait(40_000 - 1);
    expect(polls()).toBe(2);
    await wait(1);
    expect(polls()).toBe(3);

    await wait(60_000);
    expect(polls()).toBe(4);

    await wait(BADGE_POLL_MAX_MS);
    expect(polls()).toBe(5);

    // Стеля тримається: далі ті самі 90 с.
    await wait(BADGE_POLL_MAX_MS);
    expect(polls()).toBe(6);
  });

  it("повертає базовий крок, коли число змінилось", async () => {
    mocks.badge.mockReset();
    mocks.badge.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(3);

    const view = renderHook(() => useUnreadBadge());

    await wait(BADGE_POLL_MS);
    await wait(40_000);
    expect(view.result.current).toBe(3);

    // Число змінилось — наступний крок знову базовий, а не 60 с.
    await wait(BADGE_POLL_MS - 1);
    const before = polls();
    await wait(1);
    expect(polls()).toBe(before + 1);
  });

  it("на сигнал питає зразу й повертає базовий крок", async () => {
    renderHook(() => useUnreadBadge());

    await wait(BADGE_POLL_MS);
    expect(polls()).toBe(2);

    await act(async () => signal());
    expect(polls()).toBe(3);

    await wait(BADGE_POLL_MS);
    expect(polls()).toBe(4);
  });

  it("невидимий екран не опитує й не слухає сигнал", async () => {
    renderHook(() => useUnreadBadge());
    await wait(BADGE_POLL_MS);
    expect(polls()).toBe(2);

    await act(async () => setHidden(true));
    await wait(BADGE_POLL_MAX_MS * 3);
    expect(polls()).toBe(2);

    await act(async () => signal());
    expect(polls()).toBe(2);

    await act(async () => setHidden(false));
    expect(polls()).toBe(3);
  });
});
