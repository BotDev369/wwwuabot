/**
 * Шаблон — це те, що обирають **очима**, тож перевіряємо саме перегляд.
 *
 * Порожній перегляд не падає ніде: картка вибору просто покаже пусту сторінку,
 * і людина обиратиме навмання. Тому тут чотири речі, яких не видно ні в
 * компіляторі, ні на око — **чи заповнений приклад**, **чи він показує всі
 * поля**, **чи влазить у стелі полів** і **чи назва береться з того самого
 * поля, що й у житті**.
 *
 * @module @wwwuabot/shared/pages
 */

import { describe, expect, it } from "vitest";
import {
  PAGE_TEMPLATES,
  buildPageConfig,
  pageTemplate,
  pageTitle,
  primaryField,
} from "./templates";

describe("перегляд шаблону", () => {
  for (const template of PAGE_TEMPLATES) {
    describe(template.label, () => {
      it("приклад заповнює кожне поле — інакше перегляд бреше про шаблон", () => {
        for (const field of template.fields) {
          expect(template.preview[field.key]?.trim(), `${template.key}.${field.key}`).toBeTruthy();
        }
      });

      it("перегляд показує ВСІ поля: жодне не лишається невидимим", () => {
        // `buildPageConfig` ставить блоки лише для непорожніх значень, тож
        // порожній приклад приховав би ціле поле — і людина обрала б шаблон,
        // не знаючи, що воно там є.
        const config = buildPageConfig(template, template.preview);
        expect(config.zones.main.map((block) => block.id)).toEqual(
          template.fields.map((field) => `${template.key}-${field.key}`),
        );
      });

      it("приклад влазить у стелі полів — перегляд не має бути обрізаним", () => {
        for (const field of template.fields) {
          const value = template.preview[field.key] ?? "";
          expect(value.length, `${template.key}.${field.key}`).toBeLessThanOrEqual(field.max);
        }
      });

      it("рядкове поле в прикладі — один рядок", () => {
        // Перенос у полі `line` показувався б у перегляді так, як на сторінці
        // ніколи не буде: таке поле швидко стискають (`cleanPageValue`).
        for (const field of template.fields) {
          if (field.kind !== "line") continue;
          expect(template.preview[field.key], `${template.key}.${field.key}`).not.toContain("\n");
        }
      });

      it("назву перегляду дає обов'язкове поле — те саме, що на формі", () => {
        const primary = primaryField(template);
        expect(primary.primary).toBe(true);
        expect(pageTitle(template, template.preview)).toBe(template.preview[primary.key]);
      });

      it("підпис і пояснення є: картка без них не пояснює вибір", () => {
        expect(template.label.trim()).toBeTruthy();
        expect(template.hint.trim()).toBeTruthy();
        expect(template.icon.trim()).toBeTruthy();
      });
    });
  }

  it("перегляд різних шаблонів різний — приклад не скопійований", () => {
    const seen = new Set<string>();
    for (const template of PAGE_TEMPLATES) {
      const key = pageTitle(template, template.preview);
      expect(seen.has(key), template.key).toBe(false);
      seen.add(key);
    }
  });

  it("невідомий ключ дає типовий шаблон — перегляд є і в запасному шляху", () => {
    // Ключ у базі міг лишитись від старішої версії: сторінка тоді відкривається
    // типовим шаблоном, і вибір нового теж мусить мати що показати.
    const fallback = pageTemplate("такого-нема");
    expect(buildPageConfig(fallback, fallback.preview).zones.main.length).toBe(
      fallback.fields.length,
    );
  });
});
