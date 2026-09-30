/**
 * Розбір payload на код запрошення й адресу — тести.
 *
 * Найважливіший випадок тут неочевидний: **адреса з кодом у хвості**. Якщо код
 * не відокремити, `getScenarioByBotPayload` не знає про коди й не знайде
 * сторінку — людина відкрила б посилання з адресою, а побачила б порожнечу.
 *
 * @module bot-dev/src/modules/access/payload.test
 */

import { describe, expect, it } from "vitest";
import { splitInviteCode } from "./payload";

const CODE = "inv-8f3k2q";

describe("розбір payload", () => {
  it("без коду payload лишається адресою", () => {
    expect(splitInviteCode("mydate_1980-03-03")).toEqual({
      inviteCode: null,
      pagePayload: "mydate_1980-03-03",
    });
    expect(splitInviteCode("")).toEqual({ inviteCode: null, pagePayload: "" });
  });

  it("⛔ адреса з кодом у хвості: код відокремлено, адреса лишилась адресою", () => {
    // Саме такий payload складає `buildShareLinks` з `inviteCode`.
    expect(splitInviteCode(`mydate_1980-03-03_${CODE}`)).toEqual({
      inviteCode: CODE,
      pagePayload: "mydate_1980-03-03",
    });
  });

  it("головна з кодом — це посилання-запрошення, а не адреса", () => {
    expect(splitInviteCode(CODE)).toEqual({ inviteCode: CODE, pagePayload: "" });
  });

  it("⛔ код не в хвості не вважається кодом", () => {
    // Хвіст — це останній сегмент, бо саме так посилання збирається. Код у
    // першому сегменті означав би адресу сторінки, а не запрошення.
    expect(splitInviteCode(`${CODE}_mydate`)).toEqual({
      inviteCode: null,
      pagePayload: `${CODE}_mydate`,
    });
  });

  it("⛔ не- код не вважається кодом: адреса сторінки може виглядати так само", () => {
    expect(splitInviteCode("invite")).toEqual({ inviteCode: null, pagePayload: "invite" });
    expect(splitInviteCode("inv-")).toEqual({ inviteCode: null, pagePayload: "inv-" });
    expect(splitInviteCode("inv-XYZ")).toEqual({ inviteCode: null, pagePayload: "inv-XYZ" });
  });

  it("код у хвості багатосегментної адреси не з'їдає параметри", () => {
    expect(splitInviteCode(`shop_7_products_${CODE}`)).toEqual({
      inviteCode: CODE,
      pagePayload: "shop_7_products",
    });
  });
});
