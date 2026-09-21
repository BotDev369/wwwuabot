/**
 * Дошка оголошень — сторож **місця на екрані**.
 *
 * Тут ламається тихо: досить повернути кнопку створення окремим блоком на всю
 * ширину — і вкладка знову починається з пів екрана, яке нічого не повідомляє.
 * Тому перевіряється:
 *
 * - створення живе **в ряду** клітинок разом із пошуком і виборами (`.wb-tools-add`),
 *   а самого `.wb-space-create` немає — того класу більше немає й у CSS;
 * - список бере **спільну розкладку** колекції (`wb-collection--rows`), а не
 *   власну: інакше «рядки / плитки» довелось би писати другою розкладкою;
 * - дії під своїм оголошенням — **словом** (`.wb-ad-action`), а не кнопками
 *   бренду: три заливки важили б більше за саме оголошення.
 *
 * @module web-platform-dev/src/pages/SpaceAdsTab.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Ad } from "@wwwuabot/shared/ads";
import { SpaceAdsTab } from "./SpaceAdsTab";
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

const ITEMS: SpaceAd[] = [
  { ad: ad({ id: 1, title: "Телевізор", price: "1000", place: "Київ" }), mine: true },
  { ad: ad({ id: 2, title: "Велосипед", isActive: false }), mine: true },
  { ad: ad({ id: 3, title: "Квартира", kind: "rentOut", place: "Львів" }), mine: false },
];

const noop = (): void => {};
const ok = async (): Promise<void> => {};

const render = (items: SpaceAd[] = ITEMS): string =>
  renderToStaticMarkup(
    <SpaceAdsTab
      items={items}
      loading={false}
      error={null}
      onRetry={noop}
      onCompose={noop}
      onToggle={ok}
      onRemove={ok}
    />,
  );

describe("SpaceAdsTab", () => {
  it("створення стоїть у ряду керування, а не окремим блоком", () => {
    const html = render();

    expect(html).toContain('class="wb-tools-bar"');
    expect(html).toContain('class="wb-tools-add"');
    expect(html).toContain('aria-label="Створити оголошення"');
    // Акцент у ряду означає дію — і він там рівно одна.
    expect(html.match(/wb-tools-add/g)).toHaveLength(1);
    // Кнопки на всю ширину більше немає — ні в розмітці, ні як класу в CSS.
    expect(html).not.toContain("wb-space-create");
  });

  it("ряд несе пошук і вибори: вид та чиї", () => {
    const html = render();

    expect(html).toContain("wb-tools-search");
    expect(html).toContain('aria-label="Вид оголошення: Усі види"');
    expect(html).toContain('aria-label="Чиї оголошення: Усі"');
    // Вигляд — той самий кирпичик, що в нотаток і контактів.
    expect(html).toContain("wb-collection-tool");
  });

  it("список бере спільну розкладку колекції, а не власну", () => {
    const html = render();

    expect(html).toContain("wb-collection wb-collection--rows");
    expect(html).not.toContain("wb-ads");
  });

  it("дії під своїм — словом і на кожне оголошення окремо", () => {
    const html = render();

    // Два власні оголошення (одне з них чернетка) — три дії в кожного.
    expect(html.match(/<button[^>]*wb-ad-action/g)).toHaveLength(6);
    expect(html).toContain("Видалити");
    // Чернетка каже, що її можна показати: стан видно з підпису дії.
    expect(html).toContain("Показати");
    expect(html).toContain("Прибрати");
  });

  it("не робить із дій кнопок бренду", () => {
    // Заливка бренду під кожним оголошенням важила б більше за сам текст.
    const html = render();
    const actions = html.slice(html.indexOf("wb-ad-actions"));

    expect(actions).not.toContain("wb-btn");
  });

  it("порожня дошка не показує смугу, але каже, де створити", () => {
    const html = render([]);

    expect(html).not.toContain("wb-tools-bar");
    expect(html).toContain("Тут поки нічого немає");
    expect(html).toContain("нижньому футері");
  });
});
