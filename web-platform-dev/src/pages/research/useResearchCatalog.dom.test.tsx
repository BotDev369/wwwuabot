// @vitest-environment jsdom
/**
 * Каталог дослідження: успіх дає блоки, невдача — порожній каталог без помилки.
 *
 * @module web-platform-dev/src/pages/research/useResearchCatalog
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/shared/api/research.api", () => ({
  researchApi: { catalog: vi.fn() },
}));

import { researchApi } from "@/shared/api/research.api";
import type { ResearchCatalog } from "@wwwuabot/shared/research";
import { useResearchCatalog } from "./useResearchCatalog";

const CATALOG: ResearchCatalog = {
  title: "Дослідження: тест",
  slug: "viruvannia",
  updatedAt: "2026-11-01",
  blocks: [],
};

beforeEach(() => {
  vi.mocked(researchApi.catalog).mockReset();
});

describe("useResearchCatalog", () => {
  it("починає із завантаження й віддає каталог", async () => {
    vi.mocked(researchApi.catalog).mockResolvedValue(CATALOG);

    const { result } = renderHook(() => useResearchCatalog());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.catalog).toEqual(CATALOG);
  });

  it("невдача лишає порожній каталог, а не помилку на екрані", async () => {
    vi.mocked(researchApi.catalog).mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useResearchCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.catalog).toBeNull();
  });
});
