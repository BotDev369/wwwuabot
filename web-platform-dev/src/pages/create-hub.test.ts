/**
 * Хаб «Створити» — те, що ламається мовчки.
 *
 * Тут чотири речі, яких не видно ні в компіляторі, ні на око: **абетка**
 * (пункти в коді лежать не за абеткою, тож переставити їх випадково дуже
 * легко), **намір створити** (`?new=1` легко загубити — і кнопка «+» тихо
 * відкривала б список замість форми), **наявність обох адрес** (пункт без
 * адреси не падає, він мовчки нічого не робить) і **чесність заглушки**
 * (дія, за якою нічого немає, мусить про це сказати).
 *
 * @module web-platform-dev/src/pages/create-hub.test
 */

import { describe, expect, it, vi } from "vitest";
import { toWebPath } from "@wwwuabot/shared/content";
import { CONTACTS_PATH, MESSAGES_PATH, NOTES_PATH, withCreateIntent } from "../app/routes";
import {
  CREATE_HUB_ITEMS,
  HUB_INTENTS,
  buildHubItems,
  hubIntentPath,
  hubIntentSoon,
  hubItemSoon,
  type CreateHubItem,
  type HubIntent,
} from "./create-hub";
import { spaceTabPath } from "./space-tabs";

function byKey(key: string): CreateHubItem {
  const item = CREATE_HUB_ITEMS.find((entry) => entry.key === key);
  if (!item) throw new Error(`немає пункту «${key}»`);
  return item;
}

describe("склад хабу «Створити»", () => {
  it("сім пунктів, і жодного зайвого", () => {
    expect(CREATE_HUB_ITEMS).toHaveLength(7);
  });

  it("пункти стоять за абеткою — А→Я", () => {
    const labels = CREATE_HUB_ITEMS.map((item) => item.label);
    expect(labels).toEqual([
      "Дати",
      "Контакти",
      "Локації",
      "Нотатки",
      "Оголошення",
      "Повідомлення",
      "Сторінки",
    ]);
    // Абетка перевіряється мовою, а не оком: кирилиця має літери (Ґ, Є, І, Ї),
    // яких звичайний `sort()` не знає — він ставить за кодом символа.
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "uk")));
  });

  it("жодного підписа «Мій / Мої»", () => {
    for (const item of CREATE_HUB_ITEMS) expect(item.label, item.key).not.toMatch(/^Мо[їй]/);
  });

  it("ключі не повторюються, і підпис у кожного є", () => {
    const keys = CREATE_HUB_ITEMS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const item of CREATE_HUB_ITEMS) expect(item.label.trim(), item.key).toBeTruthy();
  });

  it("порожнього місця немає: пункт або кудись веде, або каже, що буде", () => {
    // Пункт, у якого не працює жодна дія, має право стояти в списку тільки з
    // поясненням: інакше це безіменний прямокутник, який нікуди не веде й
    // нічого не обіцяє.
    for (const item of CREATE_HUB_ITEMS) {
      const working = Boolean(item.view || item.create);
      expect(working || Boolean(item.soon), item.key).toBe(true);
    }
  });

  it("заглушки позначені заглушками й мають пояснення", () => {
    const soon = CREATE_HUB_ITEMS.filter(hubItemSoon).map((item) => item.key);
    expect(soon).toEqual(["locations", "pages"]);
    for (const item of CREATE_HUB_ITEMS.filter(hubItemSoon)) {
      // Заглушка без пояснення — це та сама тиша, лише з іншим виглядом.
      expect(item.soon, item.key).toBeTruthy();
      expect(hubIntentSoon(item, "view"), item.key).toBe(item.soon);
      expect(hubIntentSoon(item, "create"), item.key).toBe(item.soon);
    }
  });
});

describe("входи пункту", () => {
  it("готові пункти ведуть на свої екрани", () => {
    expect(hubIntentPath(byKey("notes"), "view")).toBe(NOTES_PATH);
    expect(hubIntentPath(byKey("contacts"), "view")).toBe(CONTACTS_PATH);
    expect(hubIntentPath(byKey("messages"), "view")).toBe(MESSAGES_PATH);
    // Адреси — ті самі константи, що в роутера: два літерали розійшлися б, і
    // пункт вів би на 404.
    expect(NOTES_PATH).toBe("/notes");
    expect(CONTACTS_PATH).toBe("/contacts");
    expect(MESSAGES_PATH).toBe("/messages");
  });

  it("«Дати» ведуть у свою сторінку, бо адресу дає `slug`", () => {
    expect(hubIntentPath(byKey("mydate"), "view")).toBe(toWebPath("mydate"));
    expect(hubIntentPath(byKey("mydate"), "view")).toBe("/mydate");
  });

  it("«Оголошення» ведуть у **вкладку** дошки, а не в Простір взагалі", () => {
    // Без розділу в адресі відкривалася б стрічка людей, і вкладку довелося б
    // шукати самій людині.
    expect(hubIntentPath(byKey("ads"), "view")).toBe(spaceTabPath("ads"));
    expect(hubIntentPath(byKey("ads"), "view")).toBe("/space?tab=ads");
  });

  it("«створити» — та сама адреса плюс намір", () => {
    for (const key of ["notes", "contacts", "messages", "ads"]) {
      const item = byKey(key);
      expect(hubIntentPath(item, "create"), key).toBe(
        withCreateIntent(hubIntentPath(item, "view") ?? ""),
      );
    }
    expect(hubIntentPath(byKey("notes"), "create")).toBe("/notes?new=1");
  });

  it("намір не ламає адресу, у якої вже є свій параметр", () => {
    // `?` замість `&` зробив би `new` частиною `tab`, і замість створення
    // відкривався б список.
    expect(hubIntentPath(byKey("ads"), "create")).toBe("/space?tab=ads&new=1");
  });

  it("дії, якої ще немає, адреси не має — і це видно до дотику", () => {
    for (const item of CREATE_HUB_ITEMS) {
      for (const intent of HUB_INTENTS.map((entry) => entry.key)) {
        const missing = hubIntentPath(item, intent) === null;
        // Порожнього пункту немає: якщо хоч один вхід не працює, причина названа.
        if (missing) expect(hubIntentSoon(item, intent as HubIntent), item.key).toBeTruthy();
      }
    }
    expect(hubIntentPath(byKey("mydate"), "create")).toBeNull();
    expect(hubIntentPath(byKey("pages"), "view")).toBeNull();
  });
});

describe("пункти для списку", () => {
  const navigate = vi.fn();
  const onSoon = vi.fn();
  const items = buildHubItems({ navigate, onSoon });

  it("у кожного пункту рівно дві дії — подивитись і створити", () => {
    for (const item of items) {
      expect(
        item.actions.map((action) => action.key),
        item.key,
      ).toEqual(["view", "create"]);
      // Дія без імені — безіменна кнопка для скрінрідера.
      for (const action of item.actions) expect(action.label, item.key).toContain(item.label);
    }
    expect(items[0].actions[0].label).toBe("Переглянути: Дати");
    expect(items[0].actions[1].label).toBe("Створити: Дати");
  });

  it("дія, за якою нічого немає, позначена приглушеною", () => {
    const mydate = items.find((item) => item.key === "mydate");
    expect(mydate?.actions.map((action) => Boolean(action.soon))).toEqual([false, true]);
    // А пункт, у якого не працює нічого, каже про себе цілком.
    expect(items.find((item) => item.key === "pages")?.status).toBe("soon");
    expect(items.find((item) => item.key === "mydate")?.status).toBe("ready");
  });

  it("робоча дія веде на адресу, а не мовчить", () => {
    navigate.mockClear();
    items.find((item) => item.key === "notes")?.actions[0].onSelect();
    expect(navigate).toHaveBeenCalledWith("/notes");
    items.find((item) => item.key === "notes")?.actions[1].onSelect();
    expect(navigate).toHaveBeenCalledWith("/notes?new=1");
  });

  it("заглушка не мовчить, а називає причину", () => {
    onSoon.mockClear();
    navigate.mockClear();
    items.find((item) => item.key === "pages")?.actions[1].onSelect();

    expect(navigate).not.toHaveBeenCalled();
    expect(onSoon).toHaveBeenCalledWith(byKey("pages").soon);
  });
});
