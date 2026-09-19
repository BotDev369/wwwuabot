/**
 * Перехід за особистим лінком — **що саме сталося**.
 *
 * Від цього рішення залежить єдине вітання в продукті: `invited` показує екран
 * запрошення, решта — звичайну головну. Помилка тут не ламає нічого видимо, і
 * саме тому її легко не помітити: людина або вдруге чує «вас запросили», або не
 * чує цього взагалі.
 *
 * @module bot-dev/src/modules/contacts/contact-link.test
 */

import { describe, expect, it } from "vitest";
import type { AppContext } from "../../shared/types/env";
import { applyContactPayload, type ContactPayloadResult } from "./contact-link";

const OWNER = 100;
const GUEST = 555;
const CODE = "inv-8f3k2q";

interface Row {
  id: number;
  owner_id: number;
  joined_user_id: number | null;
}

interface Capture {
  sql: string;
}

/**
 * База, яка відповідає одним рядком на всі запити.
 *
 * `changes` керує долею закріплення: саме ним `UPDATE … WHERE joined_bot_at IS
 * NULL` каже, чи встиг хтось інший.
 */
function context(
  row: Row | null,
  options: { changes?: number; fail?: boolean; viewerId?: number } = {},
) {
  const statements: Capture[] = [];
  const db = {
    prepare: (sql: string) => {
      statements.push({ sql });
      const statement = {
        bind: () => statement,
        first: async () => {
          if (options.fail) throw new Error("D1 недоступна");
          return row;
        },
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: options.changes ?? 1, last_row_id: 1 } }),
      };
      return statement;
    },
  };
  const ctx = {
    env: { DB: db },
    from: { id: options.viewerId ?? GUEST, username: "guest" },
  } as unknown as AppContext;
  return { ctx, statements };
}

/** Чи зверталися до бази з `UPDATE` — тобто чи намагались закріпити. */
function attached(statements: Capture[]): boolean {
  return statements.some((s) => /^UPDATE contacts/.test(s.sql.trim()));
}

describe("перехід за лінком контакту", () => {
  it("перший перехід закріплює людину — і саме він дає вітання", async () => {
    const { ctx, statements } = context({ id: 7, owner_id: OWNER, joined_user_id: null });

    expect(await applyContactPayload(ctx, CODE)).toEqual({ kind: "invited", ownerId: OWNER });
    expect(attached(statements)).toBe(true);
  });

  it("повторний перехід нікого не закріплює й не вітає", async () => {
    const { ctx, statements } = context({ id: 7, owner_id: OWNER, joined_user_id: GUEST });

    expect<ContactPayloadResult>(await applyContactPayload(ctx, CODE)).toEqual({ kind: "revisit" });
    expect(attached(statements)).toBe(false);
  });

  it("лінк, який щойно зайняв хтось інший, — теж повторний, а не вітання", async () => {
    // Гонка: рядок був вільний, а `UPDATE` нічого не змінив.
    const { ctx } = context({ id: 7, owner_id: OWNER, joined_user_id: null }, { changes: 0 });

    expect(await applyContactPayload(ctx, CODE)).toEqual({ kind: "revisit" });
  });

  it("за власним лінком власник нікого не закріплює", async () => {
    // Той, хто відкрив, — сам власник контакту: закріплювати нікого.
    const { ctx, statements } = context(
      { id: 7, owner_id: OWNER, joined_user_id: null },
      { viewerId: OWNER },
    );

    expect(await applyContactPayload(ctx, CODE)).toEqual({ kind: "own" });
    expect(attached(statements)).toBe(false);
  });

  it("невідомий код — не наше: payload живе далі своїм життям", async () => {
    const { ctx, statements } = context({ id: 7, owner_id: OWNER, joined_user_id: null });

    // Адреса сторінки теж проходить `isValidBotPayload`, тож її не можна
    // приймати за код — і тим більше ходити за нею в базу.
    expect(await applyContactPayload(ctx, "mydate")).toEqual({ kind: "unknown" });
    expect(statements).toHaveLength(0);
  });

  it("код не знайшовся — теж не наше", async () => {
    const { ctx } = context(null);

    expect(await applyContactPayload(ctx, CODE)).toEqual({ kind: "unknown" });
  });

  it("база впала — людина все одно бачить бота", async () => {
    const { ctx } = context(null, { fail: true });

    expect(await applyContactPayload(ctx, CODE)).toEqual({ kind: "unknown" });
  });
});
