/**
 * Сторож спільного висновку: **кожна комбінація має текст**.
 *
 * Шість комбінацій §7.5 — це шість різних відповідей людині. Якщо для
 * комбінації немає тексту, вона мовчить найважливіше: «обидва разом» або
 * «тривога переважає». Тому прогалина в мапі падає тестом, а не порожнім
 * заголовком на екрані.
 */
import { describe, expect, it } from "vitest";
import { combinedKeyOf, type CombinedKey } from "@wwwuabot/shared/assessments";
import { COMBINED_TEXTS } from "./combined";

const ALL: readonly CombinedKey[] = [
  "comorbid",
  "mood-dominant",
  "anxiety-dominant",
  "mild-both",
  "low-both",
  "border",
];

describe("спільний висновок", () => {
  it("усі шість комбінацій мають заголовок і текст", () => {
    for (const key of ALL) {
      expect(COMBINED_TEXTS[key]?.title, key).toBeTruthy();
      expect(COMBINED_TEXTS[key]?.body, key).toBeTruthy();
    }
  });

  it("кожна комбінація з `combinedKeyOf` має текст — без дірок у покритті", () => {
    // Перебір реальних сум, а не списку ключів: так знайдеться комбінація,
    // яку хтось забув додати у «дані», додавши ключ у типи.
    for (let phq = 0; phq <= 27; phq += 1) {
      for (let gad = 0; gad <= 21; gad += 1) {
        expect(COMBINED_TEXTS[combinedKeyOf(phq, gad)], `${phq}/${gad}`).toBeTruthy();
      }
    }
  });
});
