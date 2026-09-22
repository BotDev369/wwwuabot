/**
 * Зайняті адреси — те, що ламається мовчки.
 *
 * Сторінка людини відкривається за своїм `slug` через catch-all (`*`) у
 * `router.tsx`, а екрани платформи — це **власні** маршрути. Отже, сторінка з
 * адресою `space` не «перекриє» розділ: вона просто **ніколи не відкриється**,
 * і ні компілятор, ні тести про це не скажуть. Тому список зайнятих сегментів
 * живе в спільному модулі (`@wwwuabot/shared/pages`), а цей тест стереже, щоб
 * він не розійшовся з `app/routes.ts` — єдиним власником маршрутів.
 *
 * @module web-platform-dev/src/pages/user-pages/page-address.test
 */

import { describe, expect, it } from "vitest";
import { RESERVED_PAGE_SLUGS } from "@wwwuabot/shared/pages";
import {
  CONTACTS_ROUTE,
  CREATE_ROUTE,
  MESSAGES_PATH,
  NOTES_ROUTE,
  PAGES_ROUTE,
  PROFILE_ROUTE,
  SPACE_ROUTE,
} from "../../app/routes";

/** Перший сегмент шляху: `/messages?peer=1` → `messages`. */
function topSegment(path: string): string {
  return path.replace(/^\//, "").split(/[/?#]/, 1)[0] ?? "";
}

describe("адреси, зайняті платформою", () => {
  it("кожен верхній сегмент маршруту не може стати адресою сторінки", () => {
    const segments = [
      PROFILE_ROUTE,
      SPACE_ROUTE,
      NOTES_ROUTE,
      CONTACTS_ROUTE,
      CREATE_ROUTE,
      PAGES_ROUTE,
      topSegment(MESSAGES_PATH),
    ];

    for (const segment of segments) {
      // Причина, а не констатація: сегмент мусить бути в списку рівно тому, що
      // на ньому стоїть маршрут платформи.
      expect(RESERVED_PAGE_SLUGS).toContain(segment);
    }
  });

  it("службові шляхи воркера теж зайняті", () => {
    expect(RESERVED_PAGE_SLUGS).toContain("api");
    expect(RESERVED_PAGE_SLUGS).toContain("assets");
  });
});
