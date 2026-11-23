/**
 * Гейт карти маршрутів: реєстр і компоненти мусять покривати одне одного.
 *
 * `registry.json` — дані (адреса, назва, батько), карта `key → компонент` —
 * код. Розійтися вони можуть двома способами, і обидва тихі: рядок у реєстрі
 * без компонента (маршрут не з'явиться) і компонент без рядка (екран недосяжний).
 *
 * @module web-platform-dev/src/app/screen-routes.test
 */

import { describe, expect, it } from "vitest";
import { SCREENS } from "@wwwuabot/shared/screens";
import { COMPONENT_KEYS, SCREEN_ROUTES } from "./screen-routes";

describe("маршрути з реєстру", () => {
  it("кожен екран реєстру, крім входу, має компонент", () => {
    const orphan = SCREENS.filter(
      (screen) => screen.key !== "entry" && !COMPONENT_KEYS.includes(screen.key),
    ).map((screen) => screen.key);

    expect(orphan).toEqual([]);
  });

  it("у карті немає ключа, якого немає в реєстрі", () => {
    const keys = new Set(SCREENS.map((screen) => screen.key));
    expect(COMPONENT_KEYS.filter((key) => !keys.has(key))).toEqual([]);
  });

  it("маршрут — відносний шлях без дублів", () => {
    const paths = SCREEN_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.filter((path) => path.startsWith("/"))).toEqual([]);
    expect(paths.filter((path) => path === "")).toEqual([]);
  });
});
