/**
 * Стан дialogу з адміном — тести чистих функцій.
 *
 * Тут перевіряється те, що ламається мовчки: межа чернетки (обрізаний хвіст
 * ніколи не скаже людині) і склад панелі — бо забута кнопка означає людину,
 * яка не може відправити написане.
 *
 * @module bot-dev/src/modules/access/contact/state.test
 */

import { describe, expect, it } from "vitest";
import { ACCESS_REQUEST_MAX } from "@wwwuabot/shared/access-requests";
import { CONTACT } from "../../../shared/config/texts";
import {
  appendDraft,
  buildAdminNotice,
  buildPanel,
  buildWriteButton,
  readContactAction,
  readContactCallback,
  readContactState,
  splitForTelegram,
} from "./state";

/** Підписи кнопок панелі — саме так їх віддає Telegram. */
function panelLabels(state: Parameters<typeof buildPanel>[0]): string[] {
  return buildPanel(state)
    .reply_markup.inline_keyboard.flat()
    .map((b) => b.text);
}

describe("чернетка звернення", () => {
  it("⛔ порожній стан — це закритий дialog, а не відкритий без тексту", () => {
    // Жива база віддає `NULL` у колонки, додані через `ALTER TABLE`.
    expect(readContactState(undefined)).toEqual({ open: false, draft: "", panelId: null });
    expect(readContactState({ admin_dialog_open: null, admin_dialog_text: null })).toEqual({
      open: false,
      draft: "",
      panelId: null,
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

    expect(appendDraft(first.text, "друге").text).toBe("перше\n\nдруге");
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

describe("панель на повідомленні", () => {
  it("закритий діалог пропонує лише «Написати адміну»", () => {
    expect(panelLabels({ open: false, draft: "старе" })).toEqual([CONTACT.write]);
  });

  it("відкритий дialog без тексту — тільки «Закрити діалог»: відправляти нічого", () => {
    expect(panelLabels({ open: true, draft: "" })).toEqual([CONTACT.close]);
  });

  it("⛔ після першого повідомлення — три дії: відправити, завершити, закрити", () => {
    // Без цих кнопок написане неможливо відіслати — дialog не має виходу.
    expect(panelLabels({ open: true, draft: "є текст" })).toEqual([
      CONTACT.send,
      CONTACT.sendAndClose,
      CONTACT.closeWithoutSend,
    ]);
  });

  it("екран відмови має кнопку «Написати адміну»", () => {
    expect(
      buildWriteButton()
        .inline_keyboard.flat()
        .map((b) => b.text),
    ).toEqual([CONTACT.write]);
  });

  it("⛔ callback розпізнається лише наш префікс — чужий slug лишається сторінкою", () => {
    expect(readContactCallback("contact:send-close")).toBe("send-close");
    expect(readContactCallback("contact:write")).toBe("write");

    // Інакше роутер відкривав би сторінку, якої не існує.
    expect(readContactCallback("mydate_1980-03-03")).toBeNull();
    expect(readContactCallback("contact:злодій")).toBeNull();
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
