/**
 * Дошка оголошень — сторож **місця на екрані**.
 *
 * Тут ламається тихо: досить повернути кнопку створення окремим блоком на всю
 * ширину — і екран знову починається з пів екрана, яке нічого не повідомляє.
 * Тому перевіряється:
 *
 * - створення живе **в ряду** клітинок разом із пошуком і виборами (`.wb-tools-add`),
 *   а не окремим блоком на всю ширину;
 * - список бере **спільну розкладку** колекції (`wb-collection--rows`), а не
 *   власну: інакше «рядки / плитки» довелось би писати другою розкладкою;
 * - рядок оголошення — **такий самий рядок, як у решти списків**: назва першою,
 *   вид підписом під нею, шеврон напрямку — і без знака: свого знака в
 *   оголошення немає (у гри є її знак, у людини — обличчя);
 * - дій у рядку немає — вони живуть у поверхні, яка відкривається дотиком:
 *   три підписи під кожним оголошенням займали б власний рядок у стрічці, яку
 *   читають, і рядок перестав би виглядати як усі інші.
 *
 * @module web-platform-dev/src/pages/AdsBoard.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Ad } from "@wwwuabot/shared/ads";
import { AdsBoard } from "./AdsBoard";
import type { PublicAd } from "./ads-list";

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

const ITEMS: PublicAd[] = [
  { ad: ad({ id: 1, title: "Телевізор", price: "1000", place: "Київ" }), mine: true },
  { ad: ad({ id: 2, title: "Велосипед", isActive: false }), mine: true },
  { ad: ad({ id: 3, title: "Квартира", kind: "rentOut", place: "Львів" }), mine: false },
];

const noop = (): void => {};
const ok = async (): Promise<void> => {};

const render = (items: PublicAd[] = ITEMS): string =>
  renderToStaticMarkup(
    <AdsBoard
      items={items}
      loading={false}
      error={null}
      onRetry={noop}
      onCompose={noop}
      onToggle={ok}
      onRemove={ok}
    />,
  );

describe("AdsBoard", () => {
  it("створення стоїть у ряду керування, а не окремим блоком", () => {
    const html = render();

    expect(html).toContain('class="wb-tools-bar"');
    expect(html).toContain('class="wb-tools-add"');
    expect(html).toContain('aria-label="Створити оголошення"');
    // Акцент у ряду означає дію — і він там рівно одна.
    expect(html.match(/wb-tools-add/g)).toHaveLength(1);
    // Кнопки на всю ширину немає: це була б дія окремим блоком під списком.
    expect(html).not.toContain("wb-sheet-actions");
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

  it("рядок оголошення — та сама сітка, що в решти списків", () => {
    const html = render();

    expect(html).toContain("wb-ad-open");
    // Свого знака в оголошення немає: у гри є її знак, у людини — обличчя,
    // в оголошення — тільки написане.
    expect(html).not.toContain("wb-ad-icon");
    // Назва читається першою, вид — підписом під нею, шеврон — напрямок.
    expect(html.indexOf("wb-ad-title")).toBeLessThan(html.indexOf("wb-ad-meta"));
    expect(html.indexOf("wb-ad-meta")).toBeLessThan(html.indexOf("wb-ad-more"));
  });

  it("дій у рядку немає — вони в поверхні, яка відкривається дотиком", () => {
    const html = render();

    expect(html).not.toContain("wb-ad-menu");
    expect(html).not.toContain("wb-ad-head");
    expect(html).not.toContain("Змінити");
    expect(html).not.toContain("Видалити");
  });

  it("чернетка позначена чипом — у списку вона не відрізнялась би від показаної", () => {
    // У вибірці є рівно одна вимкнена; у чужого показаного позначки немає.
    expect(render().match(/wb-badge-neutral/g)).toHaveLength(1);
    expect(render([ITEMS[2]])).not.toContain("Чернетка");
  });

  it("порожня дошка не показує смугу, але каже, де створити", () => {
    const html = render([]);

    expect(html).not.toContain("wb-tools-bar");
    expect(html).toContain("Тут поки нічого немає");
    // Порожній стан не глухий кут: на порожньому екрані смуга не малюється,
    // тож «+» тут — єдиний вхід до створення, і про нього сказано словами.
    expect(html).toContain("Натисніть «+»");
    expect(html).toContain("Створити оголошення");
  });

  it("завантаження не прикидається порожньою дошкою", () => {
    const html = renderToStaticMarkup(
      <AdsBoard
        items={[]}
        loading
        error={null}
        onRetry={noop}
        onCompose={noop}
        onToggle={ok}
        onRemove={ok}
      />,
    );

    expect(html).toContain("Завантаження");
    expect(html).not.toContain("Тут поки нічого немає");
  });

  it("помилка називає причину й дає спробувати ще", () => {
    const html = renderToStaticMarkup(
      <AdsBoard
        items={[]}
        loading={false}
        error="Немає доступу"
        onRetry={noop}
        onCompose={noop}
        onToggle={ok}
        onRemove={ok}
      />,
    );

    expect(html).toContain("Немає доступу");
    expect(html).toContain("Спробувати ще");
  });
});
