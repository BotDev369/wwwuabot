/**
 * Дошка: те, що ламається мовчки.
 *
 * Пошук і фільтри — саме той код, де помилка виглядає як робочий екран: «нічого
 * не знайдено» однаково читається і коли фільтр правильний, і коли він відсіяв
 * усе. Тому тут перевіряється:
 *
 * - **слова запиту з'єднуються через «і»** — інакше пошук віддає більше, ніж
 *   просили, і це виглядає як «шукає не те»;
 * - **«лише мої» не показує чуже** — саме та помилка, від якої залежить, чи
 *   побачить людина кнопки під чужим оголошенням;
 * - **невідомий вид із бази нічого не ламає** — список даних не наш, і показ не
 *   мусить залежати від того, що туди колись потрапило;
 * - **види у фільтрі — лише ті, що справді є**: порожній пункт читався б як
 *   «на дошці такого немає», хоч це неправда лише про цю добірку.
 *
 * @module web-platform-dev/src/pages/ads-view.test
 */

import { describe, expect, it } from "vitest";
import type { Ad } from "@wwwuabot/shared/ads";
import { DEFAULT_ADS_VIEW, adsChips, adsKinds, filterAds, type AdsView } from "./ads-view";
import type { SpaceAd } from "./ads-list";

function ad(overrides: Partial<Ad> & { id: number }): Ad {
  return {
    ownerId: 1,
    kind: "sell",
    title: "",
    body: "",
    price: "",
    place: "",
    isActive: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
    ...overrides,
  };
}

const mine = (entry: Ad): SpaceAd => ({ ad: entry, mine: true });
const alien = (entry: Ad): SpaceAd => ({ ad: entry, mine: false });

const view = (patch: Partial<AdsView> = {}): AdsView => ({ ...DEFAULT_ADS_VIEW, ...patch });

describe("фільтри дошки", () => {
  const items: SpaceAd[] = [
    mine(ad({ id: 1, kind: "sell", title: "Телевізор", price: "1000", place: "Київ" })),
    mine(ad({ id: 2, kind: "buy", title: "Велосипед", isActive: false })),
    alien(ad({ id: 3, kind: "rentOut", title: "Квартира", place: "Львів" })),
  ];

  it("пошук з'єднує слова через «і», а не «або»", () => {
    // «київ телевізор» мусить знайти оголошення з обома словами; якби слова
    // з'єднувались через «або», знайшлось би й «Квартира, Львів».
    expect(filterAds(items, view({ query: "київ телевізор" })).map((i) => i.ad.id)).toEqual([1]);
    expect(filterAds(items, view({ query: "київ квартира" }))).toEqual([]);
  });

  it("шукає і за підписом виду, а не лише за текстом", () => {
    // Людина пише «продам», а не `sell`: вид — те, що вона бачить на чипі.
    expect(filterAds(items, view({ query: "продам" })).map((i) => i.ad.id)).toEqual([1]);
  });

  it("«лише мої» не показує чужого — і бере чернетки теж", () => {
    expect(filterAds(items, view({ whose: "mine" })).map((i) => i.ad.id)).toEqual([1, 2]);
  });

  it("«лише чернетки» — це рівно вимкнене, і воно завжди своє", () => {
    expect(filterAds(items, view({ whose: "drafts" })).map((i) => i.ad.id)).toEqual([2]);
  });

  it("фільтр за видом лишає один вид", () => {
    expect(filterAds(items, view({ kind: "buy" })).map((i) => i.ad.id)).toEqual([2]);
    expect(filterAds(items, view({ kind: "gift" }))).toEqual([]);
  });

  it("фільтри складаються: пошук плюс вид плюс «чиї»", () => {
    expect(
      filterAds(items, view({ kind: "sell", whose: "all", query: "київ" })).map((i) => i.ad.id),
    ).toEqual([1]);
    expect(filterAds(items, view({ kind: "sell", whose: "drafts" }))).toEqual([]);
  });

  it("без фільтрів список лишається тим самим, у тому самому порядку", () => {
    // Порядок дає база (чернетки попереду) — фільтр не має права його рухати.
    expect(filterAds(items, view()).map((i) => i.ad.id)).toEqual([1, 2, 3]);
  });

  it("невідомий вид із бази нічого не ламає", () => {
    const strange = [alien(ad({ id: 9, title: "Дивне", kind: "unknown" as Ad["kind"] }))];

    expect(filterAds(strange, view())).toHaveLength(1);
    // І у фільтрі його немає: там лише закритий список `AD_KINDS`.
    expect(adsKinds(strange)).toEqual([]);
  });
});

describe("види у фільтрі", () => {
  it("лишає лише ті, що справді є, — у порядку закритого списку", () => {
    const items = [mine(ad({ id: 1, kind: "gift" })), mine(ad({ id: 2, kind: "sell" }))];

    expect(adsKinds(items)).toEqual(["sell", "gift"]);
  });
});

describe("чипи вибраного", () => {
  it("типовий вигляд не має чипів: чип каже про вибір, а не про стан", () => {
    expect(adsChips(view())).toEqual([]);
  });

  it("кожен вибір має свій чип, і дотик повертає саме його", () => {
    const chips = adsChips(view({ query: "київ", kind: "buy", whose: "drafts" }));
    const byKey = Object.fromEntries(chips.map((chip) => [chip.key, chip]));

    expect(chips.map((chip) => chip.key)).toEqual(["query", "kind", "whose"]);
    expect(byKey.query.reset).toEqual({ query: "" });
    expect(byKey.kind.label).toBe("Куплю");
    expect(byKey.kind.reset).toEqual({ kind: "all" });
    expect(byKey.whose.label).toBe("Чернетки");
    expect(byKey.whose.reset).toEqual({ whose: "all" });
  });

  it("чип вигляду показує, як розставлено список", () => {
    const chips = adsChips(view({ layout: "cards", columns: 1 }));

    expect(chips.map((chip) => chip.label)).toEqual(["Картки · 1"]);
    expect(chips[0].reset).toEqual({ layout: "rows", columns: 2 });
  });

  it("порожній пошук не лишає чипа — інакше він знімав би ніщо", () => {
    expect(adsChips(view({ query: "   " }))).toEqual([]);
  });
});
