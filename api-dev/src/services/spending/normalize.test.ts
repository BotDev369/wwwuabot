import { describe, expect, it } from "vitest";
import {
  documentCounterparties,
  documentRow,
  num,
  orgRow,
  paymentCounterparties,
  regionRow,
  str,
  transactionRow,
} from "./normalize";

describe("терпиме читання полів", () => {
  it("порожнє й дивне дає порожньо або нуль, а не NaN", () => {
    expect(str(null)).toBe("");
    expect(str(42)).toBe("42");
    expect(num("12.5")).toBe(12.5);
    expect(num("abc")).toBe(0);
    expect(num(null)).toBe(0);
  });
});

describe("довідник розпорядника", () => {
  it("бере назву, форму й коди", () => {
    expect(
      orgRow({
        edrpou: "04360586",
        orgName: "Бучанська міська рада",
        orgForm: "Орган місцевого самоврядування",
        kopfg: "420",
        koatuu: "UA32080070010087821",
        kved: "84.11",
      }),
    ).toMatchObject({
      edrpou: "04360586",
      name: "Бучанська міська рада",
      form: "Орган місцевого самоврядування",
      kopfg: "420",
      koatuu: "UA32080070010087821",
      kved: "84.11",
    });
  });

  it("бере тип, головного розпорядника й контакти — без них немає ієрархії", () => {
    const row = orgRow({
      edrpou: "42081684",
      orgName: "КНП Бучанський ЦПМСД",
      orgType: ["Одержувач бюджетних коштiв", "Комунальне пiдприємство"],
      generalDisposer: { edrpou: "04360586", fullName: "БУЧАНСЬКА МІСЬКА РАДА" },
      address: { regionName: "Київська обл", city: "м. Буча", street: "Енергетиків", house: "12" },
      phone: "+380459748934",
      email: "buchacpmsd@ukr.com",
      registrationDate: "2023-07-28",
    });

    expect(row).toMatchObject({
      orgType: "Одержувач бюджетних коштiв, Комунальне пiдприємство",
      parentEdrpou: "04360586",
      region: "Київська обл",
      city: "м. Буча",
      address: "Енергетиків 12",
      email: "buchacpmsd@ukr.com",
      registeredAt: "2023-07-28",
    });
  });

  it("без адреси й типу лишає порожньо, а не падає", () => {
    expect(orgRow({ edrpou: "1" })).toMatchObject({
      orgType: "",
      parentEdrpou: "",
      address: "",
      city: "",
    });
  });

  it("без ЄДРПОУ не вигадує рядок", () => {
    expect(orgRow({ orgName: "Без коду" })).toBeNull();
  });
});

describe("договір", () => {
  const raw = {
    id: 2619517396,
    edrpou: "04360586",
    documentNumber: "347-РЕС",
    documentDate: "2026-01-12",
    signDate: "2026-05-04",
    amount: 30000,
    currency: "UAH",
    subject: "Поточний ремонт",
    procurementItems: [{ cpvCode: "45453000-7", nameUa: "Ремонт" }],
    contractors: [
      { identifier: "25689882", name: "КП «Бучасервіс»", contractorType: 2 },
      { identifier: "HIDDEN", name: "ФОП Іваненко", contractorType: 1 },
    ],
  };

  it("переносить номер, дати, суму й КПКВ", () => {
    const row = documentRow(raw, "contract");
    expect(row?.id).toBe("2619517396");
    expect(row?.signDate).toBe("2026-05-04");
    expect(row?.amount).toBe(30000);
    expect(row?.cpv).toBe("45453000-7");
  });

  it("зберігає замаскований ідентифікатор як є", () => {
    const row = documentRow(raw, "contract");
    const contractors = JSON.parse(row?.contractors ?? "[]") as { identifier: string }[];
    expect(contractors.map((item) => item.identifier)).toEqual(["25689882", "HIDDEN"]);
  });

  it("документ без id не потрапляє в базу", () => {
    expect(documentRow({ documentNumber: "1" }, "contract")).toBeNull();
  });
});

describe("платіж", () => {
  it("розкладає платника, отримувача й класифікацію", () => {
    const row = transactionRow({
      id: 337964502,
      payer_edrpou: "04360586",
      payer_name: "Бучанська МР",
      recipt_edrpou: "44096797",
      recipt_name: "ГУ ДПС у Київській області",
      trans_date: "2026-09-29",
      amount: 923476.01,
      currency: "UAH",
      payment_details: "Сплата ЄСВ",
      kekv: "2120",
      kpk: "1010110",
      budgetCode: "1051500000",
      contractId: null,
      contractNumber: null,
      source_name: "ДКСУ",
    });

    expect(row?.reciptEdrpou).toBe("44096797");
    expect(row?.kekv).toBe("2120");
    expect(row?.contractId).toBe("");
    expect(row?.amount).toBe(923476.01);
  });

  it("обрізає довге призначення платежу, а не губить його", () => {
    const row = transactionRow({ id: 1, payment_details: "x".repeat(5000) });
    expect(row?.paymentDetails.length).toBe(2000);
  });

  it("тримає код області: без нього довідник `/regions` не зв'язати з платежем", () => {
    expect(transactionRow({ id: 2, region_id: 10 })?.regionCode).toBe("10");
    expect(transactionRow({ id: 3 })?.regionCode).toBe("");
  });
});

describe("довідник областей і контрагенти", () => {
  it("область без коду не вигадується", () => {
    expect(regionRow({ regionCode: 10, regionName: "Київська обл", koatuu: "3200000000" })).toEqual(
      { code: "10", name: "Київська обл", koatuu: "3200000000" },
    );
    expect(regionRow({ regionName: "Без коду" })).toBeNull();
  });

  it("контрагент договору бере місто, а HIDDEN у каталог не потрапляє", () => {
    const rows = documentCounterparties({
      contractors: [
        {
          identifier: "40733817",
          name: "ТОВ БУЧАНСЬКИЙ ЗАВОД БРУКІВКИ",
          contractorType: 2,
          address: { city: "с. Блиставиця", regionName: "Київська обл" },
        },
        { identifier: "HIDDEN", name: "ФОП", contractorType: 1 },
      ],
    });

    expect(rows).toEqual([
      {
        edrpou: "40733817",
        name: "ТОВ БУЧАНСЬКИЙ ЗАВОД БРУКІВКИ",
        city: "с. Блиставиця",
        region: "Київська обл",
      },
    ]);
  });

  it("обидві сторони платежу стають контрагентами, крім порожніх і прихованих", () => {
    const row = transactionRow({
      id: "t",
      payer_edrpou: "04360586",
      payer_name: "БМР",
      recipt_edrpou: "33699425",
      recipt_name: "Бучабудзамовник",
    });

    expect(row && paymentCounterparties(row).map((item) => item.edrpou)).toEqual([
      "04360586",
      "33699425",
    ]);
    const hidden = transactionRow({ id: "h", payer_edrpou: "HIDDEN", recipt_edrpou: "33699425" });
    expect(hidden && paymentCounterparties(hidden).map((item) => item.edrpou)).toEqual([
      "33699425",
    ]);
  });
});
