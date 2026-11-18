import { describe, expect, it } from "vitest";
import { parseScenarioId } from "./scenario-view";

describe("parseScenarioId", () => {
  it("бере номер рядка сценарію", () => {
    expect(parseScenarioId("7")).toBe(7);
  });

  it("сміття в адресі — не нуль, а відсутність сценарію", () => {
    expect(parseScenarioId("abc")).toBeNull();
    expect(parseScenarioId("0")).toBeNull();
    expect(parseScenarioId("-3")).toBeNull();
    expect(parseScenarioId(undefined)).toBeNull();
  });
});
