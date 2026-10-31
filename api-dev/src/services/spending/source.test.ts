/**
 * Клієнт джерела: адреси й те, як він поводиться з відмовами.
 *
 * Головне тут — різниця між «забагато одразу» і «такого запиту не існує»:
 * `503` повторюється, `404` — ні, інакше прогін множить однакові помилки.
 *
 * @module api-dev/src/services/spending/source.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SourceError,
  contractsUrl,
  disposerUrl,
  fetchJson,
  lastLoadUrl,
  pause,
  transactionsUrl,
} from "./source";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const code = (status: number) => new Response("", { status });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("адреси джерела", () => {
  it("будуються від `api/v2` і не гублять параметрів вікна", () => {
    expect(disposerUrl("04360586")).toBe("https://api.spending.gov.ua/api/v2/disposers/04360586");

    const contracts = contractsUrl("04360586", "2026-09-01", "2026-09-30");
    expect(contracts).toContain("/disposers/contracts?");
    expect(contracts).toContain("documentDateFrom=2026-09-01");
    expect(contracts).toContain("documentDateTo=2026-09-30");

    const transactions = transactionsUrl(["04360586", "34357364"], "2026-09-01", "2026-09-30");
    expect(transactions).toContain("/api/transactions/?");
    expect(transactions).toContain("payers_edrpous=04360586%2C34357364");

    expect(lastLoadUrl()).toContain("/api/transactions/lastload");
  });
});

describe("fetchJson", () => {
  it("віддає розібраний JSON і не чіпає повторів", async () => {
    const fetchMock = vi.fn(async () => ok({ a: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJson("https://example.test/1")).resolves.toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("на 404 не повторює: це відповідь про запит, а не про сервіс", async () => {
    const fetchMock = vi.fn(async () => code(404));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJson("https://example.test/2", { retries: 3 })).rejects.toBeInstanceOf(
      SourceError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("на 503 чекає й повторює, а не здається з першої відмови", async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => (++calls === 1 ? code(503) : ok({ ok: true }))),
    );

    const pending = fetchJson("https://example.test/3", { retries: 1 });
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("мережевий збій доходить назовні, а не стає порожніми даними", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("socket closed");
      }),
    );

    await expect(fetchJson("https://example.test/4", { retries: 0 })).rejects.toThrow(
      "socket closed",
    );
  });

  it("pause завершується", async () => {
    await expect(pause(0)).resolves.toBeUndefined();
  });
});
