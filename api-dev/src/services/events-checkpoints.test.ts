/**
 * Реєстр чек-поінтів: ключі, підписи й лічба дерева. Перевіряється не форма
 * об'єкта, а те, від чого залежить аналітика: неоголошене не пишеться,
 * підпис — слово, а порожній вузол лишається у дереві.
 * @module api-dev/src/services/events-checkpoints.test
 */

import { describe, expect, it } from "vitest";
import { platformActionLabel, screenLabel, surfaceLabel } from "@wwwuabot/shared/events";
import {
  CHECKPOINT_ACTIONS,
  checkpointActionKey,
  checkpointLabel,
  checkpointTree,
  viewCheckpointKey,
} from "./events-checkpoints";

describe("checkpoints", () => {
  it("declared writes, undeclared never, empty nodes stay in the tree", () => {
    expect(checkpointActionKey("POST", "/api/user/trackers/entry")).toBe(
      "platform.trackers.trackers.entry",
    );
    expect(checkpointActionKey("POST", "/api/user/whatever")).toBeNull();

    expect(checkpointLabel("platform")).toBe(surfaceLabel("platform"));
    expect(checkpointLabel(viewCheckpointKey("trackers"))).toBe(screenLabel("trackers"));
    for (const item of CHECKPOINT_ACTIONS) {
      const label = checkpointLabel(`platform.${item.screen}.${item.key}`);
      expect(label).toBe(platformActionLabel(item.action));
      expect(label).not.toContain("/api/");
    }

    const tree = checkpointTree(
      new Map([
        ["platform.trackers", 10],
        ["platform.trackers.trackers.entry", 4],
        ["platform.unknown", 3],
      ]),
    );
    const platform = tree.find((node) => node.key === "platform");
    const trackers = platform?.children.find((node) => node.key === "platform.trackers");

    expect(trackers?.count).toBe(14);
    expect(trackers?.children[0]?.count).toBe(4);
    expect((platform?.children.filter((node) => node.count === 0) ?? []).length).toBeGreaterThan(0);
    expect(platform?.children.find((node) => node.key === "platform.unknown")).toMatchObject({
      count: 3,
    });
  });
});
