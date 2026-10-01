/**
 * Стан діалогу з адміном — тести чистих функцій.
 *
 * Тут перевіряється те, що ламається мовчки: межа чернетки (обрізаний хвіст
 * ніколи не скаже людині), кнопки клавіатури (забута кнопка = людина не може
 * закрити діалог) і поділ довгого тексту на те, що Telegram прийме.
 *
 * @module bot-dev/src/modules/access/contact/state.test
 */

import { describe, expect, it } from "vitest";
import { ACCESS_REQUEST_MAX } from "@wwwuabot/shared/access-requests";
import { CONTACT } from "../../../shared/config/texts";
import {
  appendDraft,
  buildAccessKeyboard,
  buildAdminNotice,
  buildContactKeyboard,
  readContactAction,
  readContactState,
  splitForTelegram,
} from "./state";

/** Підписи рядка клавіатури — саме так їх віддає Telegram. */
function labels(markup: ReturnType<typeof buildContactKeyboard>): string[] {
  return (markup.keyboard[0] as { text: string }[]).map((b) => b.text);
}

describe("чернетка звернення", () => {
  it("⛔ порожній стан — це закритий діалог, а не відкритий без тексту", () => {
    // Жива база віддає `NULL` у колонку, додану через `ALTER TABLE`.
    expect(readContactState(undefined)).toEqual({ open: false, draft: "" });
    expect(readContactState({ admin_dialog_open: null, admin_dialog_text: null })).toEqual({
      open: false,
      draft: "",
    });
  });

  it("кнопки розпізнаються точно: звичайний текст — не кнопка", () => {
    expect(readContactAction(CONTACT.write)).toBe("write");
    expect(readContactAction(CONTACT.close)).toBe("close");
    expect(readContactAction(CONTACT.send)).toBe("send");
    expect(readContactAction(CONTACT.sendAndClose)).toBe("send-close");
    expect(readContactAction(CONTACT.closeWithoutSend)).toBe("close-without-send");

    // «Напишіть, будь ласка» — це звернення, а не натискання кнопки.
    expect(readContactAction("Напишіть, будь ласка")).toBeNull();
  });

  it("повідомлення накопичуються в одному рядку, а не затирають одне одне", () => {
    const first = appendDraft("", "перше");
    expect(first).toEqual({ text: "перше", truncated: false });

    const second = appendDraft(first.text, "друге");
    expect(second.text).toBe("перше\n\nдруге");
  });

  it("⛔ довший за межу текст обрізається — і про це кажемо", () => {
    const result = appendDraft("", "а".repeat(ACCESS_REQUEST_MAX + 100));

    expect(result.text).toHaveLength(ACCESS_REQUEST_MAX);
    // Без цього прапорця людина дописувала б далі й не знала, що далі нічого.
    expect(result.truncated).toBe(true);
  });

  it("до межі обрізання немає", () => {
    expect(appendDraft("", "а".repeat(ACCESS_REQUEST_MAX)).truncated).toBe(false);
  });
});

describe("клавіатура діалогу", () => {
  it("⛔ поки нічого не написано — одна кнопка «Закрити діалог»", () => {
    // Надсилати нічого, тож пропонувати «Відправити» — це кнопка в нікуди.
    expect(labels(buildContactKeyboard({ open: true, draft: "" }))).toEqual([CONTACT.close]);
  });

  it("після першого повідомлення — три кнопки: відправити, завершити, закрити", () => {
    expect(labels(buildContactKeyboard({ open: true, draft: "є текст" }))).toEqual([
      CONTACT.send,
      CONTACT.sendAndClose,
      CONTACT.closeWithoutSend,
    ]);
  });

  it("закритий діалог на екрані відмови показує лише «Написати адміну»", () => {
    expect(labels(buildAccessKeyboard({ open: false, draft: "старе" }))).toEqual([CONTACT.write]);
  });

  it("відкритий діалог не збивається `/start`-ом: клавіатура лишається своя", () => {
    expect(labels(buildAccessKeyboard({ open: true, draft: "є текст" }))).toEqual([
      CONTACT.send,
      CONTACT.sendAndClose,
      CONTACT.closeWithoutSend,
    ]);
  });
});

describe("лист адміну", () => {
  it("у шапці — хто написав: ім'я, логін і Telegram-id", () => {
    const notice = buildAdminNotice({
      user_id: 555,
      first_name: "Оля",
      last_name: "К",
      username: "olya",
    });

    expect(notice).toContain("Оля К");
    expect(notice).toContain("@olya");
    expect(notice).toContain("id 555");
  });

  it("⛔ без імені й логіна лишається id — повідомлення все одно має бути впізнане", () => {
    expect(buildAdminNotice({ user_id: 7 })).toBe("Звернення від людини без допуску\nid 7");
  });
});

describe("поділ довгого тексту", () => {
  it("короткий текст іде одним повідомленням", () => {
    expect(splitForTelegram("а")).toEqual(["а"]);
  });

  it("⛔ довший за межу Telegram — ріжеться так, щоб кожна частина вмістилась", () => {
    const long = "а".repeat(6000);
    const parts = splitForTelegram(long);

    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(4096);
    expect(parts.join("")).toBe(long);
  });

  it("ріжеться по рядку, а не всередині речення", () => {
    const line = `${"а".repeat(50)}\n`;
    const original = line.repeat(100);
    const parts = splitForTelegram(original);

    // Кожен шов — на межі рядка, тож складання частин повертає текст як є.
    expect(parts.join("\n")).toBe(original);
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(4096);
  });
});
