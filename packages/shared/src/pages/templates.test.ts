/**
 * Шаблон — це те, що обирають **очима**, і те, що потім стає сторінкою.
 *
 * Тут п'ять речей, яких не видно ні в компіляторі, ні на око:
 *
 * 1. **чи заповнений приклад** — порожній перегляд не падає ніде, картка вибору
 *    просто покаже пусту сторінку, і людина обиратиме навмання;
 * 2. **чи всі поля вписані в каркас** — поле без плейсхолдера не з'явиться на
 *    сторінці ніколи, і помітити це можна було б, лише заповнивши його;
 * 3. **чи плейсхолдер займає prop цілком** — інакше `readPageValues` не
 *    відрізнив би текст людини від тексту шаблону, і форма показала б «Олена ·
 *    Київ» одним полем;
 * 4. **чи значення повертаються назад** — саме цим живе редактор;
 * 5. **чи порожня сторінка не лишає порожніх карток і ліній** — «візитка з
 *    самого імені» обіцяна в `docs/PAGES.md`, тож вона мусить бути сторінкою, а
 *    не набором пустих прямокутників.
 *
 * @module @wwwuabot/shared/pages
 */

import { describe, expect, it } from "vitest";
import type { PageBlock } from "../types/page-config.types";
import { buildPageConfig, fieldPlacements, readPageValues } from "./page-data";
import {
  PAGE_TEMPLATES,
  pageTemplate,
  pageTitle,
  primaryField,
  type PageBlockSpec,
  type PageTemplate,
} from "./templates";

/** Усі props каркаса — щоб перевірити сам каркас, а не те, що з нього вийшло. */
function layoutProps(specs: readonly PageBlockSpec[]): [string, unknown][] {
  return specs.flatMap((spec) => [
    ...Object.entries(spec.props),
    ...layoutProps(spec.children ?? []),
  ]);
}

/** Усі тексти, які блоки справді отримали. */
function renderedText(blocks: readonly PageBlock[]): string[] {
  return blocks.flatMap((block) => [
    ...Object.values(block.props).filter((value): value is string => typeof value === "string"),
    ...renderedText(block.children ?? []),
  ]);
}

function expectTemplate(template: PageTemplate, run: () => void): void {
  try {
    run();
  } catch (error) {
    // Назва шаблону у винятку: у циклі по обох шаблонах не було б видно, на
    // якому з них упало.
    throw new Error(`${template.key}: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  }
}

describe("каркас шаблону", () => {
  for (const template of PAGE_TEMPLATES) {
    describe(template.label, () => {
      it("кожне поле вписане в каркас — і рівно один раз", () => {
        const placements = fieldPlacements(template);
        const known = new Set(template.fields.map((field) => field.key));

        expectTemplate(template, () => {
          expect(Object.keys(placements).sort()).toEqual([...known].sort());
        });
      });

      it("плейсхолдер займає prop цілком — жодного змішаного тексту", () => {
        // `"Ваше ім'я · {{contact}}"` зламало б читання назад: значення
        // повернулось би разом із «Ваше ім'я · ».
        for (const [prop, raw] of layoutProps(template.layout)) {
          if (typeof raw !== "string" || !raw.includes("{{")) continue;
          expectTemplate(template, () => {
            expect(raw, prop).toMatch(/^\{\{[a-z0-9_-]+\}\}$/i);
          });
        }
      });

      it("плейсхолдери називають лише поля цього шаблону", () => {
        const known = new Set(template.fields.map((field) => field.key));
        for (const [prop, raw] of layoutProps(template.layout)) {
          if (typeof raw !== "string") continue;
          for (const match of raw.matchAll(/\{\{([a-z0-9_-]+)\}\}/gi)) {
            expectTemplate(template, () => {
              expect(known.has(match[1]), `${prop}: ${match[1]}`).toBe(true);
            });
          }
        }
      });

      it("ід блока унікальний і не порожній — інакше два блоки злились би в один", () => {
        const ids: string[] = [];
        const walk = (specs: readonly PageBlockSpec[]): void => {
          for (const spec of specs) {
            ids.push(spec.id);
            walk(spec.children ?? []);
          }
        };
        walk(template.layout);

        expectTemplate(template, () => {
          expect(ids.filter(Boolean)).toHaveLength(ids.length);
          expect(new Set(ids).size).toBe(ids.length);
        });
      });

      it("приклад заповнює кожне поле — інакше перегляд бреше про шаблон", () => {
        for (const field of template.fields) {
          expectTemplate(template, () => {
            expect(template.preview[field.key]?.trim(), field.key).toBeTruthy();
          });
        }
      });

      it("перегляд показує ВСІ поля: жодне не лишається невидимим", () => {
        const config = buildPageConfig(template, template.preview);
        const text = renderedText(config.zones.main).join("\n");

        for (const field of template.fields) {
          expectTemplate(template, () => {
            expect(text, field.key).toContain(template.preview[field.key]);
          });
        }
      });

      it("значення повертаються назад — саме ними відкривається редактор", () => {
        expectTemplate(template, () => {
          expect(readPageValues(template, buildPageConfig(template, template.preview))).toEqual(
            template.preview,
          );
        });
      });

      it("порожня сторінка — це сторінка, а не набір пустих карток", () => {
        const primary = primaryField(template);
        const config = buildPageConfig(template, { [primary.key]: template.preview[primary.key] });
        const text = renderedText(config.zones.main);

        // Ні порожніх карток, ні лінії, ні заголовків без тексту.
        expectTemplate(template, () => {
          expect(text).not.toContain("");
          expect(config.zones.main.some((block) => block.type === "divider")).toBe(false);
          expect(readPageValues(template, config)).toEqual({
            [primary.key]: template.preview[primary.key],
          });
        });
      });

      it("приклад влазить у стелі полів — перегляд не має бути обрізаним", () => {
        for (const field of template.fields) {
          const value = template.preview[field.key] ?? "";
          expectTemplate(template, () => {
            expect(value.length, field.key).toBeLessThanOrEqual(field.max);
          });
        }
      });

      it("рядкове поле в прикладі — один рядок", () => {
        // Перенос у полі `line` показувався б у перегляді так, як на сторінці
        // ніколи не буде: таке поле швидко стискають (`cleanPageValue`).
        for (const field of template.fields) {
          if (field.kind !== "line") continue;
          expectTemplate(template, () => {
            expect(template.preview[field.key], field.key).not.toContain("\n");
          });
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
    for (const field of fallback.fields) {
      expect(
        renderedText(buildPageConfig(fallback, fallback.preview).zones.main).join("\n"),
      ).toContain(fallback.preview[field.key]);
    }
  });
});
