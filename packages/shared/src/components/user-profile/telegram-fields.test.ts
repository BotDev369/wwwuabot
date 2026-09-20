/**
 * Поля картки Telegram — сторож того, що картку складаємо ми, а не Telegram.
 *
 * Три речі ламаються мовчки:
 *   1. **Порядок і склад полів** — сталі, наші. Якщо їх брати з payload, картка
 *      мінялась би від того, у якому порядку Telegram сьогодні поклав ключі;
 *   2. **Порожні поля не показуються.** «Прізвище …» у переліку не несе нічого —
 *      людина читає список як «що про мене відомо»;
 *   3. **Преміум стоїть завжди.** Telegram не надсилає `is_premium`, коли
 *      підписки немає, тож відсутність — це «ні». Без рядка людина не побачила б
 *      свого преміуму взагалі.
 *
 * @module packages/shared/src/components/user-profile/telegram-fields.test
 */

import { describe, expect, it } from "vitest";
import { telegramFields } from "./telegram-fields";

/** Те, що Telegram реально надіслав про акаунт із порожнім прізвищем. */
const PAYLOAD = {
  id: 372567448,
  first_name: "Diskant Sergiy",
  last_name: "",
  username: "DiskantSergiy",
  language_code: "uk",
  photo_url: "https://t.me/i/userpic/320/karas.jpg",
  allows_write_to_pm: true,
};

function keysOf(payload: Record<string, unknown>): string[] {
  return telegramFields(payload).map((field) => field.key);
}

describe("telegramFields", () => {
  it("ставить поля у нашому порядку, а не в порядку payload", () => {
    expect(keysOf(PAYLOAD)).toEqual([
      "id",
      "username",
      "first_name",
      "language_code",
      "is_premium",
      "allows_write_to_pm",
    ]);
  });

  it("не показує порожнє поле", () => {
    // Прізвище в payload є, але воно порожнє: рядок «Прізвище …» — шум.
    expect(keysOf(PAYLOAD)).not.toContain("last_name");
  });

  it("показує преміум навіть коли Telegram про нього мовчить", () => {
    const premium = telegramFields(PAYLOAD).find((field) => field.key === "is_premium");

    expect(premium?.label).toBe("Telegram Premium");
    expect(premium?.value).toBe("Ні");
    expect(telegramFields({ ...PAYLOAD, is_premium: true })[4]?.value).toBe("Так");
  });

  it("позначає юзернейм `@`, як і годиться Telegram-акаунту", () => {
    const username = telegramFields(PAYLOAD).find((field) => field.key === "username");

    expect(username?.label).toBe("Юзернейм");
    expect(username?.value).toBe("@DiskantSergiy");
    // Telegram міг віддати й з позначкою — другої не додаємо.
    expect(telegramFields({ username: "@already" })[0]?.value).toBe("@already");
  });

  it("не показує фото: воно стоїть у шапці, а не рядком", () => {
    const fields = telegramFields(PAYLOAD);

    expect(fields.map((f) => f.key)).not.toContain("photo_url");
    expect(fields.map((f) => f.value).join(" ")).not.toContain("https://");
  });

  it("лишає невідоме поле внизу й зі своїм ім'ям", () => {
    const payload = { ...PAYLOAD, unknown_future_field: "нове" };
    const fields = telegramFields(payload);
    const last = fields[fields.length - 1];

    expect(last).toEqual({
      key: "unknown_future_field",
      label: "unknown_future_field",
      value: "нове",
    });
  });

  it("не показує полів сеансу Mini App — це наш дамп, а не людина", () => {
    const fields = keysOf({ ...PAYLOAD, chat_type: "private", start_param: "mydate" });

    expect(fields).not.toContain("chat_type");
    expect(fields).not.toContain("start_param");
  });

  it("на порожньому payload не вигадує полів", () => {
    expect(telegramFields(null)).toEqual([]);
    expect(telegramFields({})).toEqual([]);
  });
});
