// @vitest-environment jsdom
/**
 * Підтвердження лайка: показати — і прибрати самому.
 *
 * Обидві половини тут ламаються тихо: без появи людина не знає, що лайк
 * зберігся, а без зникнення плитка лишається висіти поверх екрана назавжди.
 *
 * @module @wwwuabot/ui/favorites/LikeToast.dom.test
 */

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LIKE_TOAST_MS, LikeToast } from "./LikeToast";
import { announceLike } from "./like-feedback";

describe("плитка підтвердження", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("нічого не малює, доки нічого не сталося", () => {
    render(<LikeToast />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("показує додане й прибирає себе сама", async () => {
    vi.useFakeTimers();
    render(<LikeToast />);

    await act(async () => {
      announceLike(true);
    });
    expect(screen.getByRole("status").textContent).toContain("Додано в обране");

    await act(async () => {
      vi.advanceTimersByTime(LIKE_TOAST_MS + 50);
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("знятий лайк каже про це іншими словами", async () => {
    render(<LikeToast />);

    await act(async () => {
      announceLike(false);
    });

    expect(screen.getByRole("status").textContent).toContain("Прибрано з обраного");
  });

  it("відписка знімає слухача: після розмонтування сигнал нічого не робить", async () => {
    const view = render(<LikeToast />);
    view.unmount();

    await act(async () => {
      announceLike(true);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });
});
