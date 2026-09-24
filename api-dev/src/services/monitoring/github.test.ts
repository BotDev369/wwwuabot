/**
 * Тести допоміжників GitHub.
 *
 * Кількості (коміти, автори, PR) тут беруться **з заголовка `Link`**, і це
 * найкрихкіше місце колектора: якщо розбір зламається, показник стане нулем
 * — а нуль на сторінці виглядає як справжнє значення.
 *
 * @module api-dev/src/services/monitoring/github.test
 */

import { describe, expect, it } from "vitest";
import { githubHeaders, parseLastPage } from "./github";

const LINK =
  '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next", ' +
  '<https://api.github.com/repositories/1/commits?per_page=1&page=812>; rel="last"';

describe("parseLastPage", () => {
  it("бере номер останньої сторінки — це і є кількість", () => {
    expect(parseLastPage(LINK)).toBe(812);
  });

  it("без заголовка повертає null (а не нуль)", () => {
    expect(parseLastPage(null)).toBeNull();
    expect(parseLastPage('</x?page=2>; rel="next"')).toBeNull();
  });

  it("розуміє `page` без інших параметрів", () => {
    expect(parseLastPage('</x?page=7>; rel="last"')).toBe(7);
  });
});

describe("заголовки запиту", () => {
  it("без токена — анонімний доступ", () => {
    expect(githubHeaders()).not.toHaveProperty("Authorization");
  });

  it("з токеном — Bearer, і завжди User-Agent", () => {
    const headers = githubHeaders("ghp_x");
    expect(headers.Authorization).toBe("Bearer ghp_x");
    expect(headers["User-Agent"]).toBeTruthy();
  });
});
