// @vitest-environment jsdom
/**
 * Спільна міра й спільний зсув: шапка аналізу — копія окремою смугою.
 *
 * Копія має сенс лише тоді, коли вона стоїть стовпець у стовпець із тілом.
 * Тут перевіряється рівно це: ширини беруться з більшої з двох мір (у шапки
 * підпис, у тіла значення — вони різні), розкладки немає — міри немає, і зсув
 * тіла повторює смуга.
 *
 * Розкладки в jsdom немає (`getBoundingClientRect` — нулі), тож міра комірок
 * задається розміткою: `data-w` — і є ширина комірки.
 *
 * @module packages/ui/src/blocks/date-analysis/usePinnedHead.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { usePinnedHead } from "./usePinnedHead";

/** Смуги, які просить хук: так у тесті видно, що він їм віддав. */
function Harness({ head, body }: { head: number[]; body: number[] }) {
  const pinned = usePinnedHead();
  return (
    <div>
      <output data-testid="widths">{pinned.widths.join(",")}</output>
      <div data-testid="pin" ref={pinned.headRef}>
        <table ref={pinned.copyRef}>
          <thead>
            <tr>
              {head.map((width, index) => (
                <th key={index} data-w={width} />
              ))}
            </tr>
          </thead>
        </table>
      </div>
      <div data-testid="scroll" ref={pinned.scrollRef} onScroll={pinned.onScroll}>
        <table ref={pinned.bodyRef}>
          <tbody>
            <tr>
              {body.map((width, index) => (
                <td key={index} data-w={width} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Ширина комірки — з розмітки: `data-w` тримає те, що показав би рушій. */
function stubLayout(): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ): DOMRect {
    const width = Number(this.getAttribute("data-w") ?? 0);
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0 } as DOMRect;
  });
}

/**
 * Смуга скролу в jsdom не рухається (розкладки немає), тож зсув тримаємо самі:
 * перевіряється не рушій, а те, що хук читає зсув тіла й віддає його шапці.
 */
function scrollable(element: HTMLElement): void {
  let left = 0;
  Object.defineProperty(element, "scrollLeft", {
    configurable: true,
    get: () => left,
    set: (value: number) => {
      left = value;
    },
  });
}

beforeEach(stubLayout);

afterEach(() => {
  vi.restoreAllMocks();
});

function mount(
  head: number[],
  body: number[],
): ReturnType<typeof render> & { widths: () => string } {
  const view = render(<Harness head={head} body={body} />);
  const find = (id: string) => view.getByTestId(id);
  scrollable(find("scroll"));
  scrollable(find("pin"));
  return { ...view, widths: () => find("widths").textContent ?? "" };
}

describe("спільні ширини стовпців", () => {
  it("бере більшу з двох мір — у шапки підпис, у тіла значення", () => {
    // Тому ширини й міряються, а не задаються: «Традиційний управитель» у
    // шапці ширший за «Венера» в тілі, і навпаки теж буває.
    expect(mount([120, 80, 60], [100, 90, 0]).widths()).toBe("120,90,60");
  });

  it("тіло ширше за шапку — ширину дає тіло", () => {
    expect(mount([100, 100], [140, 100]).widths()).toBe("140,100");
  });

  it("⛔ без розкладки ширин немає: нуль — це не міра", () => {
    // Інакше таблиця склалась би в нуль — а на серверному рендері й у тестах
    // розкладки немає саме так.
    expect(mount([0, 0], [0, 0]).widths()).toBe("");
  });

  it("стовпців у тілі менше (порожня таблиця) — міру дає шапка", () => {
    expect(mount([120, 90, 60], [0]).widths()).toBe("120,90,60");
  });
});

describe("смуга шапки їде за тілом", () => {
  it("зсув тіла повторюється шапкою", () => {
    const view = mount([120, 120], [120, 120]);
    const scroll = view.getByTestId("scroll");
    const pin = view.getByTestId("pin");

    // jsdom: смуга скролу не рухається — зсув задається прямо.
    scroll.scrollLeft = 140;
    fireEvent.scroll(scroll);

    expect(pin.scrollLeft).toBe(140);
  });

  it("міра перерахувалась — зсув шапки не лишається збитим", () => {
    const view = mount([120, 120], [120, 120]);
    const scroll = view.getByTestId("scroll");
    const pin = view.getByTestId("pin");
    scroll.scrollLeft = 90;
    fireEvent.scroll(scroll);

    // Поворот екрана: фіксовані ширини знімаються, і міра знімається наново.
    view.rerender(<Harness head={[200, 200]} body={[200, 200]} />);

    expect(view.widths()).toBe("200,200");
    expect(pin.scrollLeft).toBe(90);
  });
});
