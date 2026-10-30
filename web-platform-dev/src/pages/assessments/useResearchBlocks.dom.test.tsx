// @vitest-environment jsdom
/**
 * Кількість блоків у «Розвитку»: із каталогу, а невдача — `null`, не нуль.
 *
 * @module web-platform-dev/src/pages/assessments/useResearchBlocks.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { researchApi } from "@/shared/api/research.api";
import { useResearchBlocks } from "./useResearchBlocks";

vi.mock("@/shared/api/research.api", () => ({ researchApi: { catalog: vi.fn() } }));

function Probe() {
  const count = useResearchBlocks();
  return <span data-testid="count">{count === null ? "невідомо" : String(count)}</span>;
}

const catalog = {
  title: "У що вірить людство",
  slug: "viruvannia",
  updatedAt: "2026-10-30",
  blocks: [
    {
      id: "a1",
      slug: "viruvannia-a1",
      group: "A",
      groupTitle: "Масштаб",
      title: "Сто відсотків",
      oneLiner: "Сім категорій",
      dataDate: "2020",
      publishedDate: "2025-06-09",
      dataStatus: "verified",
      readingTime: 7,
      keyFigures: [],
    },
  ],
};

describe("useResearchBlocks", () => {
  it("бере кількість із каталогу", async () => {
    vi.mocked(researchApi.catalog).mockResolvedValue(catalog);

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
  });

  it("коли каталог не відповів — невідомо, а не нуль", async () => {
    vi.mocked(researchApi.catalog).mockRejectedValue(new Error("мережа"));

    render(<Probe />);

    await waitFor(() => expect(researchApi.catalog).toHaveBeenCalled());
    expect(screen.getByTestId("count").textContent).toBe("невідомо");
  });
});
