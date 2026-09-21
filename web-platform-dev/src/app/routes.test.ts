/**
 * Намір створити — чисті функції навколо нього й **одне правило про те, як
 * закривається форма**.
 *
 * Ламається тут усе мовчки. `withCreateIntent` з `?` замість `&` робить другий
 * параметр частиною першого — і замість форми відкривається список;
 * `withoutCreateIntent`, який чистить усі параметри, прибирає разом із наміром і
 * розділ дошки — і замість оголошень відкривається стрічка людей. Позначка
 * `CREATE_FORM_STATE` — це єдине, чим закриття форми знає, що під нею стоїть
 * розділ: без неї «назад» виводило б людину з продукту. А екран, який відкриває
 * форму не хуком, тримає її у локальному стані — і тоді «назад» не закриває
 * форму, а виходить зі **сторінки** (саме це й було дефектом).
 *
 * Останнє не видно ні в компіляторі, ні на око, тож сторож читає вихідні файли
 * екранів — так само, як `chrome.test.ts` читає CSS.
 *
 * @module web-platform-dev/src/app/routes.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CREATE_FORM_STATE,
  CREATE_PATH,
  isCreateFormEntry,
  readCreateIntent,
  withCreateIntent,
  withoutCreateIntent,
} from "./routes";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** Екрани, які вміють створювати й відкривають свою форму за `?new=1`. */
const FORM_SCREENS = [
  "web-platform-dev/src/pages/NotesPage.tsx",
  "web-platform-dev/src/pages/ContactsPage.tsx",
  "web-platform-dev/src/pages/SpacePage.tsx",
  "web-platform-dev/src/pages/MessagesPage.tsx",
];

describe("намір створити в адресі", () => {
  it("читається лише як `1`", () => {
    expect(readCreateIntent(new URLSearchParams("new=1"))).toBe(true);
    // Порожнє значення — це не «так»: адреса без значення нічого не просить.
    expect(readCreateIntent(new URLSearchParams("new="))).toBe(false);
    expect(readCreateIntent(new URLSearchParams("new=0"))).toBe(false);
    expect(readCreateIntent(new URLSearchParams("tab=ads"))).toBe(false);
  });

  it("додається до адреси, не ламаючи її власних параметрів", () => {
    expect(withCreateIntent("/notes")).toBe("/notes?new=1");
    // `?` замість `&` зробив би `new` частиною `tab` — і замість форми
    // відкривався б список.
    expect(withCreateIntent("/space?tab=ads")).toBe("/space?tab=ads&new=1");
  });

  it("знімається рівно один, а не разом із рештою", () => {
    expect(withoutCreateIntent("/notes?new=1")).toBe("/notes");
    // Розділ дошки лишається на місці: інакше закрита форма викидала б із
    // вкладки «Оголошення» у стрічку людей.
    expect(withoutCreateIntent("/space?tab=ads&new=1")).toBe("/space?tab=ads");
  });

  it("доданий і знятий намір дають ту саму адресу", () => {
    for (const path of ["/notes", "/contacts", "/messages", "/space?tab=ads"]) {
      expect(withoutCreateIntent(withCreateIntent(path)), path).toBe(path);
    }
  });

  it("позначку має лише запис форми — і лише він дозволяє крок назад", () => {
    // Позначку кладуть двоє: хаб (вхід у створення) і `useCreateForm.openForm`.
    expect(isCreateFormEntry(CREATE_FORM_STATE)).toBe(true);
    // Чужий `state` (або його відсутність) — це не запис форми: під нею розділу
    // немає, і «назад» звідти виводить із продукту.
    expect(isCreateFormEntry(undefined)).toBe(false);
    expect(isCreateFormEntry(null)).toBe(false);
    expect(isCreateFormEntry({})).toBe(false);
    expect(isCreateFormEntry({ createForm: false })).toBe(false);
    expect(isCreateFormEntry("createForm")).toBe(false);
  });

  it("хаб має власну адресу — слот футера веде саме в нього", () => {
    expect(CREATE_PATH).toBe("/create");
  });
});

describe("форму відкриває й закриває хук, а не прапорець у стані екрана", () => {
  for (const file of FORM_SCREENS) {
    it(`${file} тримає форму в адресі`, () => {
      const source = readFileSync(join(REPO_ROOT, file), "utf8");

      expect(source, file).toContain("useCreateForm");
      // Локальний `open` не закривається «назад»: адреса змінюється, а стан — ні,
      // тож людина виходить зі сторінки, а форма лишається висіти над нею.
      expect(source, file).not.toContain("readCreateIntent");
    });
  }
});
