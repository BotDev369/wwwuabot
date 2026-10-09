// @vitest-environment jsdom
/**
 * Вітрина систем рендериться, а не тільки компілюється.
 *
 * Перевіряється те, що видно людині: опис системи, акордеон параметра й
 * порожній реєстр, який каже про себе вголос.
 *
 * @module packages/ui/src/blocks/analysis-systems.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps, PageConfig } from "@wwwuabot/shared/types/page-config";
import { PageRenderer } from "../PageRenderer";
import { registerAllBlocks } from "./index";
import { AnalysisSystemsBlock } from "./AnalysisSystemsBlock";

const REGISTRY = [
  {
    id: "western",
    name: "Західна астрологія",
    description: "Параметри на основі положення Сонця.",
    implemented: true,
    parameters: [
      { key: "sunSign", label: "Знак Сонця", about: "Сонце в знаку зодіаку: основа характеру." },
      { key: "degree", label: "Наближений градус Сонця" },
    ],
  },
  {
    id: "vedic",
    name: "Ведична астрологія",
    description: "Північноіндійська традиція.",
    implemented: false,
    parameters: [{ key: "nakshatra", label: "Накшатра" }],
  },
];

function props(over: Record<string, unknown> = {}): BlockComponentProps {
  return {
    block: { id: "b1", type: "analysis-systems", order: 0, props: over },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

/** Заглушка реєстру: та сама адреса, що й у таблиці аналізу. */
function stubRegistry(systems: unknown[] = REGISTRY): { calls: string[] } {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ ok: true, systems }), { status: 200 });
    }),
  );
  return { calls };
}

/** Стан приїжджає промісом — без цього кадру екран лишається порожнім. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  stubRegistry();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AnalysisSystemsBlock", () => {
  it("показує систему з описом і її параметри", async () => {
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    expect(screen.getByText("Західна астрологія")).toBeTruthy();
    expect(screen.getByText("Параметри на основі положення Сонця.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Знак Сонця" })).toBeTruthy();
  });

  it("позначає систему, для якої ще немає розрахунку", async () => {
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    expect(screen.getByText("Ведична астрологія")).toBeTruthy();
    expect(screen.getByText("Північноіндійська традиція.")).toBeTruthy();
    expect(screen.getByText("скоро")).toBeTruthy();
  });

  /**
   * Система без формули показує себе й нічого більше: її параметрів ще немає,
   * а список порожніх підписів перетворив би вітрину на екрани прокрутки.
   */
  it("не вивалює параметри системи, якої ще не рахують", async () => {
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    expect(screen.queryByText("Накшатра")).toBeNull();
    expect(screen.queryByText("Розрахунок цієї системи ще не готовий.")).toBeNull();
  });

  it("рахована система без параметрів каже про це вголос", async () => {
    stubRegistry([{ ...REGISTRY[0], parameters: [] }]);
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    expect(screen.getByText("Розрахунок цієї системи ще не готовий.")).toBeTruthy();
  });

  it("показує всі системи реєстру, а не першу", async () => {
    stubRegistry([
      ...REGISTRY,
      { id: "human-design", name: "Дизайн людини", description: "", implemented: false },
    ]);
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    expect(screen.getByText("Західна астрологія")).toBeTruthy();
    expect(screen.getByText("Ведична астрологія")).toBeTruthy();
    expect(screen.getByText("Дизайн людини")).toBeTruthy();
  });

  it("розкриває пояснення параметра після дотику", async () => {
    const user = userEvent.setup();
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    // До дотику пояснення немає: список читають згори вниз, і розкриті тіла
    // роблять із нього полотно.
    expect(screen.queryByText("Сонце в знаку зодіаку: основа характеру.")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Знак Сонця" }));
    expect(screen.getByText("Сонце в знаку зодіаку: основа характеру.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Знак Сонця" }));
    expect(screen.queryByText("Сонце в знаку зодіаку: основа характеру.")).toBeNull();
  });

  it("параметр без пояснення не вдає кнопку", async () => {
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    expect(screen.queryByRole("button", { name: "Наближений градус Сонця" })).toBeNull();
    expect(screen.getByText("Наближений градус Сонця")).toBeTruthy();
  });

  /**
   * Вітрина — акордеон: підпис згортає список систем. Типово вона розгорнута,
   * бо сторінка не мусить ховати те, за чим людина прийшла.
   */
  it("підпис згортає вітрину й розгортає її назад", async () => {
    const user = userEvent.setup();
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    const toggle = screen.getByRole("button", { name: /Системи аналізу/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Західна астрологія")).toBeTruthy();

    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Західна астрологія")).toBeNull();

    await user.click(toggle);
    expect(screen.getByText("Західна астрологія")).toBeTruthy();
  });

  it("порожній реєстр каже про себе, а не мовчить", async () => {
    stubRegistry([]);
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    expect(screen.getByText("Систем аналізу поки немає.")).toBeTruthy();
  });

  /**
   * Склад сторінки, який лежить у базі, рендериться цілком: вітрина як блок
   * Page Builder, а не як окремий компонент.
   */
  it("рендериться у складі сторінки", async () => {
    registerAllBlocks();
    const config: PageConfig = {
      version: 1,
      zones: {
        sidebar: [],
        header: [],
        main: [
          {
            id: "dateanalysis-hero",
            type: "hero",
            order: 0,
            props: {
              title: "Зрозумій Себе. Зрозумій Інших. Зрозумій події.",
              subtitle: "Аналіз дат з 12+ систем світу",
            },
          },
          { id: "dateanalysis-systems", type: "analysis-systems", order: 1, props: {} },
        ],
        footer: [],
      },
    };

    render(
      <PageRenderer
        config={config}
        context={{ slug: "dateanalysis", title: "Аналіз дат", photoUrl: null }}
      />,
    );
    await flush();

    expect(screen.getByText("Зрозумій Себе. Зрозумій Інших. Зрозумій події.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Системи аналізу" })).toBeTruthy();
    expect(screen.getByText("Західна астрологія")).toBeTruthy();
  });

  it("бере заголовок із props, а без нього — типовий", async () => {
    render(<AnalysisSystemsBlock {...props({ title: "Методи аналізу" })} />);
    await flush();
    expect(screen.getByRole("heading", { name: "Методи аналізу" })).toBeTruthy();
  });
});
