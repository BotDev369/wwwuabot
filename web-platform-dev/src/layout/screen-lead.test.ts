/**
 * Один підпис на кожен екран: верхівка без короткого тексту — це вже інший
 * вигляд, а правило верхівки не має винятків. Тест читає реєстр екранів, тож
 * новий екран без підпису не пройде повз.
 *
 * @module web-platform-dev/src/layout/screen-lead.test
 */

import { describe, expect, it } from "vitest";
import registry from "../../../packages/shared/src/screens/registry.json";
import { screenLead } from "./screen-lead";

interface ScreenRow {
  readonly key: string;
  readonly title: string;
}

const SCREENS = (registry as unknown as readonly ScreenRow[]).filter((row) => row.key !== "entry");

describe("підпис верхівки", () => {
  it("є в кожного екрана реєстру — свій або від розділу", () => {
    const missing = SCREENS.filter((row) => (screenLead(row.key) ?? "").trim().length === 0).map(
      (row) => row.key,
    );

    expect(missing).toEqual([]);
  });

  it("не повторює назву екрана і лишається одним рядком", () => {
    const wrong = SCREENS.filter((row) => {
      const lead = screenLead(row.key) ?? "";
      return lead.toLowerCase() === row.title.toLowerCase() || lead.length > 90;
    }).map((row) => row.key);

    expect(wrong).toEqual([]);
  });
});
