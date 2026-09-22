/**
 * Хаб «Створити» — те, що ламається мовчки.
 *
 * Тут чотири речі, яких не видно ні в компіляторі, ні на око: **абетка**
 * (пункти в коді лежать не за абеткою, тож переставити їх випадково дуже
 * легко), **дві різні дії** («подивитись» веде на екран, «створити» відкриває
 * поверхню **на хабі** — переплутати їх означає знову вести людину на іншу
 * сторінку замість форми), **наявність обох входів** (пункт без адреси не
 * падає, він мовчки нічого не робить) і **чесність заглушки** (дія, за якою
 * нічого немає, мусить про це сказати).
 *
 * @module web-platform-dev/src/pages/create-hub.test
 */

import { describe, expect, it, vi } from "vitest";
import { toWebPath } from "@wwwuabot/shared/content";
import { CONTACTS_PATH, MESSAGES_PATH, NOTES_PATH, PAGES_PATH } from "../app/routes";
import {
  CREATE_HUB_ITEMS,
  HUB_INTENTS,
  buildHubItems,
  hubIntentReady,
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
      const working = Boolean(item.view || item.form);
      expect(working || Boolean(item.soon), item.key).toBe(true);
    }
  });

  it("заглушки позначені заглушками й мають пояснення", () => {
    const soon = CREATE_HUB_ITEMS.filter(hubItemSoon).map((item) => item.key);
    // «Сторінки» тут більше немає: пункт став робочим (шаблон, текст,
    // публічність) — а заглушка, яку забули зняти, гірша за відсутню.
    expect(soon).toEqual(["locations"]);
    for (const item of CREATE_HUB_ITEMS.filter(hubItemSoon)) {
      // Заглушка без пояснення — це та сама тиша, лише з іншим виглядом.
      expect(item.soon, item.key).toBeTruthy();
      expect(hubIntentSoon(item, "view"), item.key).toBe(item.soon);
      expect(hubIntentSoon(item, "create"), item.key).toBe(item.soon);
    }
  });
});

describe("входи пункту", () => {
  it("«подивитись» веде на екран розділу", () => {
    expect(byKey("notes").view).toBe(NOTES_PATH);
    expect(byKey("contacts").view).toBe(CONTACTS_PATH);
    expect(byKey("messages").view).toBe(MESSAGES_PATH);
    // Адреси — ті самі константи, що в роутера: два літерали розійшлися б, і
    // пункт вів би на 404.
    expect(NOTES_PATH).toBe("/notes");
    expect(CONTACTS_PATH).toBe("/contacts");
    expect(MESSAGES_PATH).toBe("/messages");
  });

  it("«Дати» ведуть у свою сторінку, бо адресу дає `slug`", () => {
    expect(byKey("mydate").view).toBe(toWebPath("mydate"));
    expect(byKey("mydate").view).toBe("/mydate");
  });

  it("«Оголошення» ведуть у **вкладку** дошки, а не в Простір взагалі", () => {
    // Без розділу в адресі відкривалася б стрічка людей, і вкладку довелося б
    // шукати самій людині.
    expect(byKey("ads").view).toBe(spaceTabPath("ads"));
    expect(byKey("ads").view).toBe("/space?tab=ads");
  });

  it("«Сторінки» ведуть у власний список, а плюс — на вкладку «Сторінка»", () => {
    // Список і створення — два різні входи: «подивитись» показує своє (разом
    // із приватним), «створити» відкриває шаблон поверх хабу.
    expect(byKey("pages").view).toBe(PAGES_PATH);
    expect(byKey("pages").form).toBe("page");
    expect(PAGES_PATH).toBe("/pages");
  });

  it("«створити» — ключ поверхні, а не адреса: жодного `?new=1`", () => {
    expect(byKey("notes").form).toBe("note");
    expect(byKey("contacts").form).toBe("contact");
    expect(byKey("messages").form).toBe("message");
    expect(byKey("ads").form).toBe("ad");
    // Пункт, який уміє лише показувати, форми не має — і «+» каже про це.
    expect(byKey("mydate").form).toBeUndefined();
    expect(byKey("mydate").view).toBeTruthy();
  });

  it("дії, якої ще немає, немає й у даних — і це видно до дотику", () => {
    for (const item of CREATE_HUB_ITEMS) {
      for (const intent of HUB_INTENTS.map((entry) => entry.key)) {
        const missing = !hubIntentReady(item, intent as HubIntent);
        // Порожнього пункту немає: якщо хоч один вхід не працює, причина названа.
        if (missing) expect(hubIntentSoon(item, intent as HubIntent), item.key).toBeTruthy();
      }
    }
    expect(hubIntentReady(byKey("mydate"), "create")).toBe(false);
    expect(hubIntentReady(byKey("locations"), "view")).toBe(false);
    expect(hubIntentReady(byKey("locations"), "create")).toBe(false);
    expect(hubIntentReady(byKey("pages"), "view")).toBe(true);
    expect(hubIntentReady(byKey("pages"), "create")).toBe(true);
  });
});

describe("пункти для списку", () => {
  const navigate = vi.fn();
  const onForm = vi.fn();
  const onSoon = vi.fn();
  const items = buildHubItems({ navigate, onForm, onSoon });

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
    expect(items.find((item) => item.key === "locations")?.status).toBe("soon");
    expect(items.find((item) => item.key === "mydate")?.status).toBe("ready");
    expect(items.find((item) => item.key === "pages")?.status).toBe("ready");
  });

  it("«подивитись» веде на адресу й замінює хаб, а не лишає його за спиною", () => {
    // `replace` тут — не оптимізація: без нього «назад» із розділу повертає на
    // «Створити», тобто людина, яка обрала нотатки, опиняється перед вибором,
    // з якого щойно пішла.
    navigate.mockClear();
    items.find((item) => item.key === "notes")?.actions[0].onSelect();

    expect(navigate).toHaveBeenCalledWith("/notes", { replace: true });
  });

  it("«створити» **не переходить нікуди** — лише відкриває поверхню", () => {
    // Це і є правило хабу: «+» не веде на іншу сторінку, її відкриває окрема
    // кнопка («подивитись»). Перехід тут означав би автоматичну зміну екрана.
    for (const key of ["notes", "contacts", "messages", "ads", "pages"]) {
      navigate.mockClear();
      onForm.mockClear();

      items.find((item) => item.key === key)?.actions[1].onSelect();

      expect(navigate, key).not.toHaveBeenCalled();
      expect(onForm, key).toHaveBeenCalledTimes(1);
      expect(onForm, key).toHaveBeenCalledWith(byKey(key).form);
    }
  });

  it("заглушка не мовчить, а називає причину", () => {
    onSoon.mockClear();
    navigate.mockClear();
    onForm.mockClear();
    items.find((item) => item.key === "locations")?.actions[0].onSelect();

    expect(navigate).not.toHaveBeenCalled();
    expect(onForm).not.toHaveBeenCalled();
    expect(onSoon).toHaveBeenCalledWith(byKey("locations").soon);
  });

  it("«Дати» показують, але не створюють", () => {
    navigate.mockClear();
    onForm.mockClear();
    items.find((item) => item.key === "mydate")?.actions[1].onSelect();

    expect(navigate).not.toHaveBeenCalled();
    expect(onForm).not.toHaveBeenCalled();
    expect(onSoon).toHaveBeenCalledWith(byKey("mydate").soon);
  });
});
