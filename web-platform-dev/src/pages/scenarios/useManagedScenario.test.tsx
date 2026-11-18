// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ManagedScenario } from "@wwwuabot/shared/pages";
import { useManagedScenario } from "./useManagedScenario";

const state = {
  pages: [] as ManagedScenario[],
  loading: false,
  error: null as string | null,
};

vi.mock("./useManagedScenarios", () => ({ useManagedScenarios: () => state }));

function scenario(id: number): ManagedScenario {
  return {
    id,
    slug: `s-${id}`,
    title: `Сценарій ${id}`,
    template: "shop",
    values: {},
    isPublic: true,
    staff: [],
    role: "owner",
    updatedAt: "",
  };
}

beforeEach(() => {
  state.pages = [scenario(7)];
  state.loading = false;
  state.error = null;
});

describe("сценарій за номером з адреси", () => {
  it("знаходить свій рядок у списку", () => {
    const { result } = renderHook(() => useManagedScenario("7"));

    expect(result.current.page?.slug).toBe("s-7");
  });

  it("сміття в адресі — не «нуль», а відсутність сценарію", () => {
    const { result } = renderHook(() => useManagedScenario("abc"));

    expect(result.current.page).toBeNull();
  });

  it("чужого номера в списку немає — сценарію теж", () => {
    const { result } = renderHook(() => useManagedScenario("8"));

    expect(result.current.page).toBeNull();
  });
});
