/**
 * Підписи Є-data: гроші, дати й те, як екран називає нуль.
 *
 * Головна перевірка — `totalsText`: нуль тут означає «джерело не оприлюднило»,
 * а не «видатків не було» (`docs/SPENDING.md` §5). Показати замість цього
 * цифру означало б зробити з відсутності даних твердження про гроші.
 * @module web-admin-dev/src/pages/spending/format.test
 */

import { describe, expect, it } from "vitest";
import type { SpendingSyncRow } from "@wwwuabot/shared/spending";
import {
  contractorNames,
  counterparty,
  formatDate,
  formatMoney,
  formatPeriod,
  formatStamp,
  lastLoadSources,
  periodsOf,
  roleLabel,
  statusClass,
  statusLabel,
  syncKindLabel,
  syncStepSubject,
  totalsText,
} from "./format";

/** Локалі `uk-UA` розділяють розряди нерозривним пробілом — зводимо до звичайного. */
const plain = (value: string): string => value.replace(/\s/g, " ");

function syncRow(period: string, status: SpendingSyncRow["status"] = "ok"): SpendingSyncRow {
  return {
    key: `payments:${period}`,
    kind: "payments",
    period,
    status,
    rows: 1,
    startedAt: "2026-10-01T05:37:00.000Z",
    finishedAt: "2026-10-01T05:38:00.000Z",
    error: "",
  };
}

describe("період", () => {
  it("місяць називається словом, а не кодом", () => {
    expect(formatPeriod("2026-09")).toBe("вересень 2026");
  });

  it("порожній період — прочерк, а не «null 2026»", () => {
    expect(formatPeriod(null)).toBe("—");
  });

  it("невідомий формат лишається як прийшов", () => {
    expect(formatPeriod("осінь")).toBe("осінь");
  });

  it("періоди йдуть від нового до старого й без повторів", () => {
    const rows = [syncRow("2026-08"), syncRow("2026-09"), { ...syncRow("2026-09"), key: "x" }];

    expect(periodsOf(rows)).toEqual(["2026-09", "2026-08"]);
  });

  it("період без значення у вибір не потрапляє", () => {
    expect(periodsOf([syncRow("")])).toEqual([]);
  });
});

describe("гроші", () => {
  it("сума показується у валюті рядка", () => {
    expect(plain(formatMoney(1500.5))).toBe("1 500,50 ₴");
  });

  it("код валюти, якого немає в ISO, не валить рендер", () => {
    expect(plain(formatMoney(10, "гривня"))).toBe("10,00 ₴");
  });

  it("⛔ нуль — це «не оприлюднено», а не 0 ₴", () => {
    expect(totalsText({ count: 0, amount: 0 })).toBe("не оприлюднено");
  });

  it("непорожній зріз показує кількість і суму", () => {
    expect(plain(totalsText({ count: 29, amount: 1500.5 }))).toBe("29 · 1 500,50 ₴");
  });
});

describe("дати", () => {
  it("дата джерела не зсувається на день", () => {
    expect(formatDate("2026-09-10")).toBe("10.09.2026");
  });

  it("порожня дата — прочерк", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("не дата")).toBe("—");
  });

  it("час збору показується з роком і хвилинами", () => {
    expect(formatStamp("2026-10-01T05:38:00.000Z")).toMatch(/01\.10\.2026/);
  });

  it("зіпсований час — прочерк, а не «Invalid Date»", () => {
    expect(formatStamp("2026-13-45")).toBe("—");
    expect(formatStamp(null)).toBe("—");
  });
});

describe("стан збору", () => {
  it("три стани мають три різні підписи", () => {
    expect(statusLabel("ok")).toBe("зібрано");
    expect(statusLabel("error")).toBe("помилка");
    expect(statusLabel("running")).toBe("у процесі");
  });

  it("клас стану задає колір в одному місці", () => {
    expect(statusClass("ok")).toBe("spend-status spend-status-ok");
    expect(statusClass("error")).toBe("spend-status spend-status-error");
    expect(statusClass("running")).toBe("spend-status spend-status-running");
  });
});

describe("кроки збору", () => {
  it("предмет кроку названий словом, а не кодом колектора", () => {
    expect(syncKindLabel("contracts")).toBe("Договори");
    expect(syncKindLabel("transactions")).toBe("Платежі");
  });

  it("невідомий код лишається як прийшов — він хоч щось та значить", () => {
    expect(syncKindLabel("warmup")).toBe("warmup");
  });

  it("ключ кроку не показують: замість нього назва розпорядника", () => {
    const row: SpendingSyncRow = {
      ...syncRow("2026-09"),
      key: "org:04360586:2026-09",
      kind: "contracts",
    };
    const orgs = [
      {
        edrpou: "04360586",
        name: "Бучанська міська рада",
        form: "",
        koatuu: "",
        documents: { count: 0, amount: 0 },
        payments: { count: 0, amount: 0 },
        receipts: { count: 0, amount: 0 },
      },
    ];

    expect(syncStepSubject(row, orgs)).toBe("Бучанська міська рада");
  });

  it("розпорядник без довідника називається за СДРПОУ, а не порожнечею", () => {
    const row: SpendingSyncRow = { ...syncRow("2026-09"), key: "org:99999999:2026-09" };

    expect(syncStepSubject(row, [])).toBe("ЄДРПОУ 99999999");
  });

  it("пачка платежів має номер, а не адресу рядка в базі", () => {
    const row: SpendingSyncRow = { ...syncRow("2026-09"), key: "transactions:2026-09:batch-2" };

    expect(syncStepSubject(row, [])).toBe("пачка 2");
  });
});

describe("довідка джерела", () => {
  it("стає списком «джерело → дата», а не сирим JSON", () => {
    const rows = lastLoadSources([
      { sourceId: 1, sourceName: "ПАТ УКРЗАЛІЗНИЦЯ", lastLoad: "2022-07-06" },
      { sourceId: 2, sourceName: "КП МСЕЗ", lastLoad: "2026-10-13" },
    ]);

    expect(rows).toEqual([
      { name: "КП МСЕЗ", date: "2026-10-13" },
      { name: "ПАТ УКРЗАЛІЗНИЦЯ", date: "2022-07-06" },
    ]);
  });

  it("чужа форма відповіді не валить рендер", () => {
    expect(lastLoadSources({ organizations: [] })).toEqual([]);
    expect(lastLoadSources(null)).toEqual([]);
    expect(lastLoadSources(["рядок", 5, null])).toEqual([]);
  });

  it("запис без назви лишається з датою, а не зникає", () => {
    expect(lastLoadSources([{ lastLoad: "2026-09-01" }])).toEqual([
      { name: "без назви", date: "2026-09-01" },
    ]);
  });
});

describe("сторони й контрагенти", () => {
  it("роль платежу називається словом", () => {
    expect(roleLabel("payer")).toBe("сплати");
    expect(roleLabel("recipt")).toBe("надходження");
  });

  it("прихований ідентифікатор названий прихованим, а не порожнім", () => {
    expect(contractorNames([{ identifier: "HIDDEN", name: "ФОП", kind: 1 }])).toBe(
      "ФОП (ідентифікатор прихований)",
    );
  });

  it("без контрагентів — прочерк", () => {
    expect(contractorNames([])).toBe("—");
  });

  it("у сплаті другою стороною є отримувач, у надходженні — платник", () => {
    const transaction = {
      id: "1",
      payerEdrpou: "04360586",
      payerName: "Рада",
      reciptEdrpou: "43907812",
      reciptName: "Ліцей",
      transDate: "2026-09-12",
      amount: 250,
      currency: "UAH",
      paymentDetails: "",
      kekv: "",
      kpk: "",
      budgetCode: "",
      contractId: "",
      contractNumber: "",
      sourceName: "",
    };

    expect(counterparty(transaction, "payer")).toBe("Ліцей");
    expect(counterparty(transaction, "recipt")).toBe("Рада");
    expect(counterparty({ ...transaction, reciptName: "" }, "payer")).toBe("—");
  });
});
