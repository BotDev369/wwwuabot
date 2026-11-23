/**
 * Зайняті адреси — те, що ламається мовчки.
 *
 * Сторінка людини відкривається за своїм `slug` через catch-all (`*`), а екрани
 * платформи — це **власні** маршрути. Отже, сторінка з адресою `analysis` не
 * «перекриє» розділ: вона просто **ніколи не відкриється**, і ні компілятор, ні
 * тести про це не скажуть. Тому список зайнятих сегментів **виводиться з
 * реєстру**, а цей тест стереже саму властивість: кожен верхній сегмент адреси
 * реєстру зайнятий.
 *
 * @module web-platform-dev/src/pages/scenarios/page-address.test
 */

import { describe, expect, it } from "vitest";
import { RESERVED_PAGE_SLUGS } from "@wwwuabot/shared/pages";
import { SCREENS } from "@wwwuabot/shared/screens";

describe("адреси, зайняті платформою", () => {
  it("кожен верхній сегмент адреси реєстру не може стати адресою сторінки", () => {
    const roots = [
      ...new Set(
        SCREENS.flatMap((screen) => {
          const top = (screen.path ?? "").split("/").filter(Boolean)[0];
          return top && !top.startsWith(":") ? [top] : [];
        }),
      ),
    ];

    expect(roots.length).toBeGreaterThan(0);
    for (const segment of roots) {
      // Причина, а не констатація: сегмент мусить бути в списку рівно тому, що
      // на ньому стоїть маршрут платформи.
      expect(RESERVED_PAGE_SLUGS, `сегмент «${segment}»`).toContain(segment);
    }
  });

  it("службові шляхи воркера теж зайняті", () => {
    expect(RESERVED_PAGE_SLUGS).toContain("api");
    expect(RESERVED_PAGE_SLUGS).toContain("assets");
  });
});
