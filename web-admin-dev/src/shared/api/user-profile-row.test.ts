/**
 * Переклад рядка `users` у спільний профіль: що саме потрапляє в картку.
 *
 * Тут три рішення, які ламаються мовчки:
 *
 * 1. `telegram_json` — **сирий** рядок, який пише бот. Пошоджений або порожній
 *    JSON не має вбивати картку: адмін мусить бачити решту даних про людину.
 * 2. `permissions` — JSON-масив, але старі рядки писали його через кому, тож
 *    обидва записання розбираються, а невизначений не стає масивом довільних
 *    рядків.
 * 3. Сирі поля (`rawFields`) — усе, чого немає в переліку вище, **крім**
 *    порожніх значень: `null` і `""` у діагностиці не несуть нічого, а
 *    `platform_username`, `photo_url` і `telegram_json` мають в картці власне
 *    місце, тож у сирому переліку вони були б третім показом того самого.
 */

import { describe, expect, it } from "vitest";

import type { UserRow } from "./users.api";
import { parseTelegramJson, rowToProfile } from "./user-profile-row";

/** Рядок `users` з усіма обов'язковими полями; решта — через розкриття. */
function row(fields: Partial<UserRow> = {}): UserRow {
  return {
    user_id: 42,
    first_name: "Олесь",
    last_name: null,
    username: "oles",
    language: "uk",
    created_at: "2026-01-02 03:04:05",
    is_blocked: 0,
    role: "user",
    tariff: "free",
    status: "active",
    discount: null,
    permissions: null,
    ...fields,
  };
}

describe("telegram_json з рядка", () => {
  it("об'єкт розбирається і віддається як є", () => {
    expect(parseTelegramJson('{"id":1,"first_name":"Олесь"}')).toEqual({
      id: 1,
      first_name: "Олесь",
    });
  });

  it("масив і не-об'єкт — це null, а не показ сміття", () => {
    expect(parseTelegramJson("[1,2]")).toBeNull();
    expect(parseTelegramJson('"Олесь"')).toBeNull();
    expect(parseTelegramJson("null")).toBeNull();
  });

  it("пошоджений JSON не валить картку", () => {
    expect(parseTelegramJson('{"id":1')).toBeNull();
    expect(parseTelegramJson("")).toBeNull();
    expect(parseTelegramJson("   ")).toBeNull();
  });

  it("не рядок — теж null: колонка могла прийти вже розпакованою", () => {
    expect(parseTelegramJson({ id: 1 })).toBeNull();
    expect(parseTelegramJson(null)).toBeNull();
  });
});

describe("профіль із рядка", () => {
  it("основні поля перекладаються в спільні назви", () => {
    const profile = rowToProfile(
      row({ last_name: "К", platform_username: "karas", discount: 15, is_blocked: 1 }),
    );

    expect(profile.id).toBe(42);
    expect(profile.firstName).toBe("Олесь");
    expect(profile.lastName).toBe("К");
    expect(profile.username).toBe("oles");
    expect(profile.platformUsername).toBe("karas");
    expect(profile.role).toBe("user");
    expect(profile.tariff).toBe("free");
    expect(profile.status).toBe("active");
    expect(profile.discount).toBe(15);
    expect(profile.isBlocked).toBe(1);
    expect(profile.createdAt).toBe("2026-01-02 03:04:05");
  });

  it("фото платформи окреме від фото Telegram", () => {
    const profile = rowToProfile(
      row({
        photo_url: "https://cdn/karas.png",
        telegram_json: '{"photo_url":"https://tg/a.png"}',
      }),
    );

    expect(profile.photoUrl).toBe("https://cdn/karas.png");
    expect(profile.telegram).toEqual({ photo_url: "https://tg/a.png" });
    // Аватар у блоці імені бере фото платформи, а не Telegram — інакше картка
    // показувала б чуже фото під чужим іменем.
    expect(profile.photoUrl).not.toBe(profile.telegram?.photo_url);
  });

  it("без фото платформи аватар лишається порожнім, а не фото Telegram", () => {
    const profile = rowToProfile(row({ telegram_json: '{"photo_url":"https://tg/a.png"}' }));
    expect(profile.photoUrl ?? null).toBeNull();
  });

  it("відсутнє ім'я на платформі — це null, а не undefined-рядок", () => {
    expect(rowToProfile(row()).platformUsername).toBeNull();
  });

  it("дозволи читаються з JSON-масиву", () => {
    expect(
      rowToProfile(row({ permissions: '["manage_shops","manage_users"]' })).permissions,
    ).toEqual(["manage_shops", "manage_users"]);
  });

  it("старе записання через кому теж розбирається, із обрізаними пробілами", () => {
    expect(rowToProfile(row({ permissions: "manage_shops, manage_users" })).permissions).toEqual([
      "manage_shops",
      "manage_users",
    ]);
  });

  it("порожні місця в старому списку не стають порожніми дозволами", () => {
    expect(rowToProfile(row({ permissions: "manage_shops,, manage_users," })).permissions).toEqual([
      "manage_shops",
      "manage_users",
    ]);
  });

  it("невизначений дозвіл — порожній список, а не один рядок-обманка", () => {
    expect(rowToProfile(row({ permissions: null })).permissions).toEqual([]);
    expect(rowToProfile(row({ permissions: "" })).permissions).toEqual([]);
    expect(rowToProfile(row({ permissions: "{}" })).permissions).toEqual([]);
  });
});

describe("сирі поля", () => {
  it("у перелік потрапляє те, чого немає вище", () => {
    const profile = rowToProfile(row({ my_dates: "2026-01-01", active_scenario: 7 }));
    expect(profile.rawFields).toEqual({ my_dates: "2026-01-01", active_scenario: 7 });
  });

  it("поля, що мають в картці власне місце, у сирий перелік не потрапляють", () => {
    const profile = rowToProfile(
      row({
        platform_username: "karas",
        photo_url: "https://cdn/karas.png",
        telegram_json: '{"id":1}',
        permissions: '["manage_shops"]',
      }),
    );
    expect(profile.rawFields ?? {}).toEqual({});
  });

  it("порожні значення — не «сирі поля», а відсутність даних", () => {
    const profile = rowToProfile(
      row({ my_dates: null, active_scenario: "", message_id: undefined }),
    );
    expect(profile.rawFields).toBeUndefined();
  });

  it("без зайвих колонок сирого переліку немає взагалі, а не порожній об'єкт", () => {
    expect(rowToProfile(row()).rawFields).toBeUndefined();
  });
});
