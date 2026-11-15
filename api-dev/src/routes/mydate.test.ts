/**
 * Маршрути MyDate: чотири дії одного домену й жодного зайвого шляху.
 *
 * Модуль з'явився з роутера (межа 400 рядків), тож тест стереже рівно те, що
 * могло зламатись під час переїзду: яка адреса в який обробник веде й що
 * зіпсований відсотковий код дати дає 400, а не виняток.
 *
 * @module api-dev/src/routes/mydate.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const calls = vi.hoisted(() => ({ seen: [] as string[] }));

vi.mock("../controllers/astrology.controller", () => {
  const record =
    (name: string, body: unknown = null) =>
    async () => {
      calls.seen.push(name);
      return new Response(body === null ? name : JSON.stringify(body));
    };
  return {
    handleAnalysisRead: async (_request: Request, _env: unknown, date: string) => {
      calls.seen.push(`read:${date}`);
      return new Response("ok");
    },
    handleAnalyze: record("analyze"),
    handleSystems: record("systems"),
    handleCompare: record("compare"),
  };
});

const { matchMyDateRoute } = await import("./mydate");

const env = {} as Env;
const request = (method = "GET") =>
  new Request("https://api.example.com/api/mydate/systems", { method });

describe("matchMyDateRoute", () => {
  it("дата в шляху декодується й доходить до читання", async () => {
    calls.seen = [];
    const response = await matchMyDateRoute(request(), env, "/api/mydate/analysis/2026-11-15");
    expect(calls.seen).toEqual(["read:2026-11-15"]);
    expect(response).not.toBeNull();
  });

  it("зіпсований відсотковий код — 400, а не виняток", async () => {
    const response = await matchMyDateRoute(request(), env, "/api/mydate/analysis/%E0%A4%A");
    expect(response?.status).toBe(400);
  });

  it("реєстр систем читається без методу й без тіла", async () => {
    calls.seen = [];
    await matchMyDateRoute(request(), env, "/api/mydate/systems");
    expect(calls.seen).toEqual(["systems"]);
  });

  it("аналіз і порівняння — лише POST", async () => {
    calls.seen = [];
    expect(await matchMyDateRoute(request("GET"), env, "/api/mydate/analyze")).toBeNull();
    expect(await matchMyDateRoute(request("POST"), env, "/api/mydate/analyze")).not.toBeNull();
    expect(await matchMyDateRoute(request("GET"), env, "/api/mydate/compare")).toBeNull();
    expect(await matchMyDateRoute(request("POST"), env, "/api/mydate/compare")).not.toBeNull();
    expect(calls.seen).toEqual(["analyze", "compare"]);
  });

  it("чужі шляхи не зачіпаються", () => {
    expect(matchMyDateRoute(request(), env, "/api/mydate")).toBeNull();
    expect(matchMyDateRoute(request(), env, "/api/notes")).toBeNull();
  });
});
