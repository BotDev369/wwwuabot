/**
 * Реєстр чек-поінтів: ключі, підписи й місце події в таблиці. Перевіряється не
 * форма об'єкта, а те, від чого залежить аналітика: неоголошене не рахується,
 * підпис — слово, а старий рядок знаходить своє місце без колонки `node`.
 * @module api-dev/src/services/events-checkpoints.test
 */

import { describe, expect, it } from "vitest";
import { CHECKPOINT_ACTIONS, checkpointActionKey, checkpointRowOf } from "./events-checkpoints";

describe("checkpoints", () => {
  it("declared writes map to rows, undeclared and bot events are ignored", () => {
    expect(checkpointActionKey("POST", "/api/user/trackers/entry")).toBe(
      "platform.trackers.trackers.entry",
    );
    expect(checkpointActionKey("POST", "/api/user/whatever")).toBeNull();

    for (const item of CHECKPOINT_ACTIONS) {
      const row = checkpointRowOf({ surface: "platform", kind: "request", action: item.action });
      expect(row?.label).not.toContain("/api/");
      expect(row?.parent).toBe(`platform.${item.screen}`);
    }

    // Старий рядок без `node` теж знаходить місце — назвою екрана з шапки.
    expect(checkpointRowOf({ surface: "platform", kind: "view", action: "Трекери" })).toEqual({
      key: "platform.trackers",
      label: "Трекери",
      parent: null,
    });
    expect(
      checkpointRowOf({ surface: "platform", kind: "view", action: "trackers" }),
    ).toMatchObject({ key: "platform.trackers" });

    // Дотик, ботівське й неоголошений запис у таблицю не потрапляють.
    expect(checkpointRowOf({ surface: "platform", kind: "click", action: "Додати" })).toBeNull();
    expect(checkpointRowOf({ surface: "bot", kind: "message", action: "привіт" })).toBeNull();
    expect(
      checkpointRowOf({ surface: "platform", kind: "request", action: "POST /api/unknown" }),
    ).toBeNull();
  });
});
