import { describe, expect, it } from "vitest";
import {
  encodeLabels,
  encodeScopes,
  parseLabels,
  parseScope,
  parseScopes,
  scopeColumnTitle,
  scopeLead,
  scopeOf,
  scopePlural,
  scopeTitle,
} from "./analysis-subject";

describe("вид суб'єкта з адреси", () => {
  it("невідоме значення — це людина, а не порожній екран", () => {
    expect(parseScope(null)).toBe("person");
    expect(parseScope("")).toBe("person");
    expect(parseScope("камінь")).toBe("person");
  });

  it("подія й змішаний режим читаються як є", () => {
    expect(parseScope("event")).toBe("event");
    expect(parseScope("mixed")).toBe("mixed");
  });

  it("одне слово задає вид усім датам", () => {
    expect(parseScopes("event", 3)).toEqual(["event", "event", "event"]);
    expect(parseScopes(null, 2)).toEqual(["person", "person"]);
  });

  it("перелік видів лягає по датах, а зайві — стають людиною", () => {
    expect(parseScopes("person,event", 2)).toEqual(["person", "event"]);
    expect(parseScopes("event,смiття", 2)).toEqual(["event", "person"]);
    expect(parseScopes("person,event", 3)).toEqual(["person", "event", "person"]);
  });

  it("спільний вид стискається до слова, різні — до переліку", () => {
    expect(encodeScopes(["event", "event"])).toBe("event");
    expect(encodeScopes(["person", "event"])).toBe("person,event");
    expect(scopeOf(["person", "person"])).toBe("person");
    expect(scopeOf(["person", "event"])).toBe("mixed");
    expect(scopeOf([])).toBe("person");
  });
});

describe("підписи суб'єктів", () => {
  it("порожній підпис лишається місцем, а не зсуває сусідів", () => {
    expect(parseLabels("Олена||Ігор")).toEqual(["Олена", "", "Ігор"]);
    expect(encodeLabels(["Олена", "", "Ігор"])).toBe("Олена||Ігор");
  });

  it("кома в імені не рве перелік", () => {
    const labels = ["Олена, сестра", "Ігор"];
    expect(parseLabels(encodeLabels(labels))).toEqual(labels);
  });
});

describe("підписи для людини й для події", () => {
  it("заголовок і стовпці називають предмет", () => {
    expect(scopeTitle("person")).toBe("Аналіз людини");
    expect(scopeTitle("event")).toBe("Аналіз події");
    expect(scopeTitle("mixed")).toBe("Аналіз людей і подій");
    expect(scopeColumnTitle("event")).toBe("Подія");
    expect(scopePlural("mixed")).toBe("Суб'єкти");
  });

  it("провідний абзац каже, що саме читають", () => {
    expect(scopeLead("event", false)).toContain("подію");
    expect(scopeLead("person", true)).toContain("вас");
    expect(scopeLead("mixed", false)).toContain("окремо");
  });
});
