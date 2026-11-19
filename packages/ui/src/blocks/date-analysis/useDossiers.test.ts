// @vitest-environment jsdom
/**
 * Один запит на екран: дати, системи й згода на опитування їдуть разом.
 *
 * Ламається мовчки: без дат запит не робиться взагалі; помилка мусить ставати
 * словами на екрані, а не порожніми доменами; два однакові набори дат не
 * мають смикати сервер двічі.
 *
 * @module packages/ui/src/blocks/date-analysis/useDossiers.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { fetchDossiers, type DossierRead } from "./api";
import { useDossiers } from "./useDossiers";

vi.mock("./api", () => ({ fetchDossiers: vi.fn() }));

const DOSSIER: DossierRead = {
  date: "1980-03-03",
  kind: "person",
  symbol: "Овен",
  claims: [],
  systems: [],
  note: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("стан профілю", () => {
  it("рахує профіль, коли є дата й системи", async () => {
    vi.mocked(fetchDossiers).mockResolvedValue({ dossiers: [DOSSIER], survey: null });
    const { result } = renderHook(() =>
      useDossiers(["1980-03-03"], ["person"], ["western"], false),
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dossiers).toEqual([DOSSIER]);
    expect(fetchDossiers).toHaveBeenCalledWith(["1980-03-03"], "person", ["western"], false);
  });

  it("без дати або без систем не турбує сервер", () => {
    const { result } = renderHook(() => useDossiers([], ["person"], ["western"], false));

    expect(fetchDossiers).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.dossiers).toEqual([]);
  });

  it("помилку віддає словами, а не ковтає", async () => {
    vi.mocked(fetchDossiers).mockRejectedValue(new Error("Помилка аналізу"));
    const { result } = renderHook(() => useDossiers(["1980-03-03"], ["person"], ["western"], true));

    await waitFor(() => expect(result.current.error).toBe("Помилка аналізу"));
    expect(result.current.loading).toBe(false);
  });

  it("мережа без Error дає зрозуміле «Помилка мережі»", async () => {
    vi.mocked(fetchDossiers).mockRejectedValue("offline");
    const { result } = renderHook(() =>
      useDossiers(["1980-03-03"], ["person"], ["western"], false),
    );

    await waitFor(() => expect(result.current.error).toBe("Помилка мережі"));
  });
});
