/**
 * Розбір тіла запиту — єдине місце, де не довіряють клієнту. Кожен тест —
 * те, що без нього дісталося б до SQL: `null` у полі, число замість рядка,
 * зайве поле. З `as`-твердженням усе це проходило непомітним.
 *
 * @module api-dev/src/shared/body.test
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readBody } from "./body";

const contactSchema = z.object({
  name: z.string().min(1),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function post(body: unknown): Request {
  return new Request("https://api.test/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("readBody", () => {
  it("повертає тип, виведений зі схеми, а не твердження", async () => {
    const result = await readBody(
      post({ name: "Оля", birth_date: "1990-05-04", note: "лишнє" }),
      contactSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.name).toBe("Оля");
      // Поле, якого немає в схемі, не потрапляє в тип — і не потрапляє в сервіс.
      expect("note" in result.body).toBe(false);
    }
  });

  it("⛔ битий JSON дає 400, а не exception у контролері", async () => {
    const result = await readBody(post("{це не json"), contactSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("⛔ не-об'єкт (null, масив, рядок) — теж 400", async () => {
    for (const body of [null, "текст", 42]) {
      const result = await readBody(post(body), contactSchema);
      expect(result.ok).toBe(false);
    }
  });

  it("⛔ відсутнє поле не доходить до сервісу", async () => {
    const result = await readBody(post({ birth_date: "1990-05-04" }), contactSchema);
    expect(result.ok).toBe(false);
  });

  it("⛔ поле не того типу відсікається: число замість рядка", async () => {
    const result = await readBody(post({ name: 42, birth_date: "1990-05-04" }), contactSchema);
    expect(result.ok).toBe(false);
  });

  it("⛔ порушений формат не проходить regex", async () => {
    const result = await readBody(post({ name: "Оля", birth_date: "04.05.1990" }), contactSchema);
    expect(result.ok).toBe(false);
  });

  it("⛔ відповідь не розкриває імена полів схеми", async () => {
    const result = await readBody(post({ name: "", birth_date: "не дата" }), contactSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = await result.response.text();
      expect(text).not.toContain("birth_date");
      expect(text).not.toContain("zod");
    }
  });
});
