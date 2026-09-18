/**
 * Сторож хрому: **футер, слот дії й бренд, який не переписує роль поверхні**.
 *
 * Два різні дефекти живуть тут поруч, і обидва ламаються мовчки.
 *
 * **Слот дії у футері.** Він займає ту саму п'яту частину смуги, що й вкладка, а
 * підпису не має — і без кола знак висів у цій порожнечі, читаючись «величезною»
 * вкладкою (сам знак при цьому звичайні 24px). Коло виправляє роль, і воно
 * ламається непомітно: втрачений `border-radius` дає квадрат, втрачене тло —
 * знову нічим не обмежений знак. Тут же — те, чого бути НЕ повинно: коло у
 * **вибраного** розділу (дія й стан це різні сенси).
 *
 * **Бренд проти ролі поверхні.** `apple.css` і `android.css` малюють модалку
 * своїм характером — пілюля, M3, темна плівка — і роблять це через
 * `!important`. Поки поверхня була тільки плаваючим аркушем, це було безпечно;
 * але в повноекранної (`--screen`) оверлей і є сторінка, і брендовий радіус
 * показував кути, яких у сторінки немає, а плівка зі склом малювала навколо неї
 * чорні плями. Тому кожне брендове правило про сам ящик мусить явно виключати
 * `--screen` — це та сама помилка, що була з мірками кнопки (див.
 * `buttons.test.ts`), і ловиться вона лише тут.
 *
 * CSS читається як текст: розбору CSS у тестовому середовищі немає
 * (`environment: node`), так само зроблено в `menu.test.ts` і `buttons.test.ts`.
 *
 * @module packages/shared/src/styles/chrome.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

interface Rule {
  selector: string;
  body: string;
}

/** Правила файлу — без коментарів: у них і селектори, і `!important` як розповідь. */
function rulesOf(file: string): Rule[] {
  const css = readFileSync(join(REPO_ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.replace(/\s+/g, " ").trim(),
    body,
  }));
}

const CHROME = rulesOf("packages/shared/src/styles/app-chrome.css");

/** Останнє правило для селектора — те, що справді діє при рівній специфічності. */
function rule(selector: string): Rule | undefined {
  return CHROME.filter((entry) => entry.selector === selector).at(-1);
}

describe("футер: слот дії", () => {
  it("«+» стоїть на акцентному колі — це кнопка, а не вкладка", () => {
    const circle = rule(".wb-tabbar-item--primary .wb-tabbar-icon");
    expect(circle, "правило знака слота дії мусить існувати").toBeDefined();
    expect(circle?.body).toContain("background: var(--accent)");
    expect(circle?.body).toContain("border-radius: var(--radius-full)");
    // Знак на залитому тлі мусить бути світлим — інакше акцент його з'їдає.
    expect(circle?.body).toContain("color: var(--text-inverse)");
    // Коло — планка пальця: менше за 40px воно перестає читатись як кнопка.
    const size = Number(circle?.body.match(/width:\s*(\d+)px/)?.[1]);
    expect(size).toBeGreaterThanOrEqual(40);
    expect(circle?.body).toContain(`height: ${size}px`);
  });

  it("у вибраного розділу кола немає — вибір показує сам знак", () => {
    // Активна вкладка відрізняється залитим близнюком іконки (`iconActive`) та
    // кольором підпису. Акцентне коло там означало б «дію», а не «тут ти».
    expect(rule(".wb-tabbar-item--active .wb-tabbar-icon")).toBeUndefined();
    // І жодне з правил активної вкладки (там уже є штрих знака) не малює кола.
    for (const entry of CHROME) {
      if (!entry.selector.includes("--active") || !entry.selector.includes("wb-tabbar-icon")) {
        continue;
      }
      expect(entry.body, entry.selector).not.toContain("background");
      expect(entry.body, entry.selector).not.toContain("border-radius");
    }
  });

  it("смуга не росте від кола: мірки задає токен, а не вміст", () => {
    // Висота смуги — `--tab-bar-h` (бренд + safe-area). Коло 40px у неї влізе
    // лише тому, що воно не більше за планку HIG (56px) і Material (60px).
    expect(rule(".wb-tabbar")?.body).toContain("height: var(--tab-bar-h)");
    expect(rule(".wb-tabbar-inner")?.body).toContain("align-items: stretch");
  });
});

/**
 * Бренд має рівно одну роль у модалки: дати **характер** плаваючому аркушу.
 * Повноекранна поверхня — не аркуш, а сторінка, і будь-яке брендове правило
 * про сам ящик мусить її пропускати — інакше `!important` повертає кути й плівку.
 */
describe("бренд не переписує роль повноекранної поверхні", () => {
  /** Селектор цілить у сам ящик (`.wb-modal` / `.wb-modal-overlay`), не в дитину. */
  const boxSelector = /(^|[\s>+~])\.wb-modal(-overlay)?(?=[:.\s]|$)/;

  for (const brand of ["apple", "android"] as const) {
    it(`${brand}: плівка, радіус і тінь — лише для плаваючого аркуша`, () => {
      const box = rulesOf(`packages/shared/src/styles/${brand}.css`).filter((entry) =>
        boxSelector.test(entry.selector),
      );
      // Якщо бренд перестав фарбувати ящик — правило нічого не перевіряє.
      expect(box.length, `${brand}: правил про ящик мусить бути хоч одне`).toBeGreaterThan(0);

      for (const entry of box) {
        const skip = entry.selector.includes("wb-modal-overlay")
          ? ":not(.wb-modal-overlay--screen)"
          : ":not(.wb-modal--screen)";
        expect(entry.selector, `${brand}: ${entry.selector}`).toContain(skip);
      }
    });
  }
});
