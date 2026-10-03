/**
 * Межа тіла аналізу: **розбір не дорівний розрахунку**.
 *
 * Тут важлива не арифметика (її перевіряють тести `mydate-helpers`), а межа
 * перед нею: тіло, з яким ми не працюємо, має відпадати **до** читання KV і D1.
 * Тому в цих тестах середовище порожнє — будь-який крок углиб кинув би `500`,
 * і це видно: `400` означає, що розбір зупинив запит на вході.
 *
 * @module api-dev/src/controllers/astrology.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { handleAnalyze, handleCompare } from "./astrology.controller";

function request(path: string, body: unknown): Request {
  return new Request(`https://api.example.com${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Середовище без бази й KV: крок углиб упав би, а не «повернув порожнє». */
const EMPTY_ENV = {} as Env;

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("не-об'єкт у тілі не доходить до розрахунку", async () => {
    const res = await handleAnalyze(request("/api/mydate/analyze", `"2026-01-01"`), EMPTY_ENV);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
  });

  it("причина відмови лишається зрозумілою, а не безликою", async () => {
    const res = await handleAnalyze(
      request("/api/mydate/analyze", { systemId: "astro" }),
      EMPTY_ENV,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Invalid or missing date" });
  });

  // Регресія: числа в переліку дат доходили до `DATE_RE`, який їх відсікав
  // непомітно, і людина отримувала «No valid dates» замість «Invalid body».
  it("дати мають бути рядками, а не числами", async () => {
    const res = await handleCompare(
      request("/api/mydate/compare", { dates: [20260101] }),
      EMPTY_ENV,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
  });
});

describe("✓ тіло, з яким працюємо", () => {
  it("брак дат — це вже про розрахунок, а не про розбір тіла", async () => {
    const res = await handleCompare(request("/api/mydate/compare", { dates: [] }), EMPTY_ENV);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "No valid dates provided" });
  });
});
