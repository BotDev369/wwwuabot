import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORDER_STATUSES,
  ORDER_STATUS_LABEL_MAX,
  activeOrderStatuses,
  isDefaultOrderStatusKey,
  isValidOrderStatusKey,
  orderStatusLabel,
  resolveOrderStatuses,
  sanitizeStatusLabel,
  validateOrderStatusOverride,
} from "./statuses";

describe("статуси замовлення", () => {
  it("без відхилень список — це типові статуси, усі увімкнені", () => {
    const statuses = resolveOrderStatuses();
    expect(statuses.map((status) => status.key)).toEqual(
      DEFAULT_ORDER_STATUSES.map((status) => status.key),
    );
    expect(statuses.every((status) => status.isActive && !status.isCustom)).toBe(true);
  });

  it("типовий статус можна перейменувати — ключ лишається тим самим", () => {
    const statuses = resolveOrderStatuses([{ key: "new", label: "Прийнято" }]);
    const renamed = statuses.find((status) => status.key === "new");
    expect(renamed?.label).toBe("Прийнято");
    expect(renamed?.isCustom).toBe(false);
  });

  it("порожній підпис не стирає типовий", () => {
    const statuses = resolveOrderStatuses([{ key: "new", label: "   " }]);
    expect(orderStatusLabel("new", statuses)).toBe("Нове");
  });

  it("типовий статус можна вимкнути — він лишається у списку, але не пропонується", () => {
    const statuses = resolveOrderStatuses([{ key: "sent", isActive: false }]);
    expect(orderStatusLabel("sent", statuses)).toBe("Надіслано");
    expect(activeOrderStatuses(statuses).some((status) => status.key === "sent")).toBe(false);
  });

  it("свій статус додається в кінець і вважається власним", () => {
    const statuses = resolveOrderStatuses([{ key: "packed", label: "Зібрано" }]);
    const custom = statuses.at(-1);
    expect(custom).toEqual({
      key: "packed",
      label: "Зібрано",
      stage: "open",
      isCustom: true,
      isActive: true,
    });
  });

  it("свій статус без підпису показується своїм ключем", () => {
    const statuses = resolveOrderStatuses([{ key: "packed" }]);
    expect(orderStatusLabel("packed", statuses)).toBe("packed");
  });

  it("стадія свого статусу задається, типова лишається своєю", () => {
    const custom = resolveOrderStatuses([{ key: "refunded", stage: "closed" }]);
    expect(custom.at(-1)?.stage).toBe("closed");
    const single = resolveOrderStatuses([{ key: "done", stage: "open" }]);
    expect(single.find((status) => status.key === "done")?.stage).toBe("open");
    expect(resolveOrderStatuses()[3]?.stage).toBe("closed");
  });

  it("неврозумілий рядок із бази не ламає список", () => {
    const statuses = resolveOrderStatuses([
      { key: "НОВЕ" },
      { key: "" },
      { key: "a".repeat(40) },
      { key: "-packed" },
    ]);
    expect(statuses.map((status) => status.key)).toEqual(
      DEFAULT_ORDER_STATUSES.map((status) => status.key),
    );
  });

  it("повтор ключа не дає другого статусу: перший рядок виграє", () => {
    const statuses = resolveOrderStatuses([
      { key: "packed", label: "Зібрано" },
      { key: "packed", label: "Спаковано" },
    ]);
    expect(statuses.filter((status) => status.key === "packed")).toHaveLength(1);
    expect(orderStatusLabel("packed", statuses)).toBe("Зібрано");
  });

  it("невідомий ключ у замовленні показується як є", () => {
    expect(orderStatusLabel("archived", resolveOrderStatuses())).toBe("archived");
    expect(orderStatusLabel(undefined, resolveOrderStatuses())).toBe("");
  });

  it("ключ — ASCII-слово, типові ключі пізнаються", () => {
    expect(isValidOrderStatusKey("packed")).toBe(true);
    expect(isValidOrderStatusKey("packed-2")).toBe(true);
    expect(isValidOrderStatusKey("2packed")).toBe(false);
    expect(isValidOrderStatusKey("packed_2")).toBe(false);
    expect(isValidOrderStatusKey("паковано")).toBe(false);
    expect(isValidOrderStatusKey("a".repeat(25))).toBe(false);
    expect(isDefaultOrderStatusKey("done")).toBe(true);
    expect(isDefaultOrderStatusKey("packed")).toBe(false);
  });
});

describe("правка статусу з форми", () => {
  it("типовий статус можна перейменувати й лишити підпис порожнім", () => {
    expect(validateOrderStatusOverride({ key: "new", label: "Прийнято" })).toEqual({
      ok: true,
      value: { key: "new", label: "Прийнято", stage: null, isActive: true },
    });
    // Порожній підпис типового — це «лишити як у коді», а не помилка.
    expect(validateOrderStatusOverride({ key: "new" })).toEqual({
      ok: true,
      value: { key: "new", label: "", stage: null, isActive: true },
    });
  });

  it("⛔ власний статус без підпису не заводять", () => {
    const result = validateOrderStatusOverride({ key: "packed" });
    expect(result).toEqual({ ok: false, message: "У власного статусу мусить бути підпис" });
  });

  it("⛔ ключ не українською: перейменування мало б стати другим статусом", () => {
    expect(validateOrderStatusOverride({ key: "Паковано", label: "Паковано" }).ok).toBe(false);
  });

  it("вимкнення — явний прапорець, стадія — зі стану", () => {
    expect(
      validateOrderStatusOverride({ key: "refunded", label: "Повернено", stage: "closed" }),
    ).toEqual({
      ok: true,
      value: { key: "refunded", label: "Повернено", stage: "closed", isActive: true },
    });
    const off = validateOrderStatusOverride({ key: "sent", isActive: false });
    expect(off.ok && off.value.isActive).toBe(false);
  });

  it("підпис з форми стискається й ріжеться стелею", () => {
    expect(sanitizeStatusLabel("  В\n роботі  ")).toBe("В роботі");
    expect(sanitizeStatusLabel("я".repeat(80)).length).toBe(ORDER_STATUS_LABEL_MAX);
  });
});
