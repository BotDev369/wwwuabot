/**
 * Намір створити — три чисті функції й **одне правило про те, хто його читає**.
 *
 * Ламається тут усе мовчки. `withCreateIntent` з `?` замість `&` робить другий
 * параметр частиною першого — і замість форми відкривається список;
 * `withoutCreateIntent`, який чистить усі параметри, прибирає разом із наміром
 * і розділ дошки — і замість оголошень відкривається стрічка людей. А екран,
 * який читає намір **сам** (а не хуком), лишає його в адресі назавжди: закрита
 * форма продовжує бути адресою, яка її відкриває, і «назад» повертає туди ж.
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
import { CREATE_PATH, readCreateIntent, withCreateIntent, withoutCreateIntent } from "./routes";

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
    expect(withoutCreateIntent(new URLSearchParams("new=1")).toString()).toBe("");
    expect(withoutCreateIntent(new URLSearchParams("tab=ads&new=1")).toString()).toBe("tab=ads");
  });

  it("доданий і знятий намір дають ту саму адресу", () => {
    // Це і є обіцянка хука: форма лишається відкритою, а адреса вертається до
    // того, чим була, — інакше вона продовжує обіцяти форму, яку закрили.
    for (const path of ["/notes", "/contacts", "/messages", "/space?tab=ads"]) {
      const [base, query = ""] = path.split("?");
      const added = withCreateIntent(path);
      const back = withoutCreateIntent(new URLSearchParams(added.split("?")[1])).toString();

      expect(back, path).toBe(query);
      expect(back ? `${base}?${back}` : base, path).toBe(path);
    }
  });

  it("хаб має власну адресу — слот футера веде саме в нього", () => {
    expect(CREATE_PATH).toBe("/create");
  });
});

describe("намір читає хук, а не сам екран", () => {
  for (const file of FORM_SCREENS) {
    it(`${file} бере намір хуком`, () => {
      const source = readFileSync(join(REPO_ROOT, file), "utf8");

      expect(source, file).toContain("useCreateIntent");
      // Читання напряму лишає намір в адресі: закрита форма продовжує бути
      // адресою, яка її відкриває.
      expect(source, file).not.toContain("readCreateIntent");
    });
  }
});
