// @vitest-environment jsdom
/**
 * Вітрина систем рендериться, а не тільки компілюється.
 *
 * Перевіряється те, що видно людині: спершу сама назва системи, а на дотик —
 * опис, історія й акордеони параметрів; порожній реєстр каже про себе вголос.
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
    history: "Класична європейська традиція: від античності до сучасних шкіл.",
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
    history: "Джйотіш — індійська астрологічна школа.",
    implemented: false,
    parameters: [{ key: "siderealSign", label: "Сидеричний знак Сонця" }],
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

/** Тіло блока типово згорнуте — відкриваємо, бо решта перевірок дивиться всередину. */
async function openBlock(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: /Системи аналізу/ }));
}

/** Система теж згорнута — розкриваємо ту, про яку перевірка. */
async function openSystem(user: ReturnType<typeof userEvent.setup>, name: string): Promise<void> {
  await user.click(screen.getByRole("button", { name: new RegExp(name) }));
}

beforeEach(() => {
  stubRegistry();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AnalysisSystemsBlock", () => {
  /**
   * Блок — акордеон і типово **згорнутий**: сторінка мусить уміщатися в екран,
   * а назва блока каже, що всередині. Системи видно після дотику до підпису.
   */
  it("типово згорнутий: системи з'являються після дотику до підпису", async () => {
    const user = userEvent.setup();
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();

    const toggle = screen.getByRole("button", { name: /Системи аналізу/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Західна астрологія")).toBeNull();

    await openBlock(user);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Західна астрологія")).toBeTruthy();
  });

  /**
   * Система теж згорнута: список читають згори вниз, і розкриті тіла роблять із
   * нього полотно. Опис, історія й параметри приходять разом — на дотик.
   */
  it("система показує опис, історію й параметри після дотику", async () => {
    const user = userEvent.setup();
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();
    await openBlock(user);

    expect(screen.queryByText("Параметри на основі положення Сонця.")).toBeNull();
    expect(screen.queryByText(/Класична європейська традиція/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Знак Сонця" })).toBeNull();

    await openSystem(user, "Західна астрологія");
    expect(screen.getByText("Параметри на основі положення Сонця.")).toBeTruthy();
    expect(screen.getByText(/Класична європейська традиція/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Знак Сонця" })).toBeTruthy();

    // Розкрита система помітна кольором — `--open` на перемикачі (той самий
    // модифікатор, що й у таблиці аналізу): каретка сама цього не показує.
    const system = screen.getByRole("button", { name: /Західна астрологія/ });
    expect(system.className).toContain("wb-param-toggle--open");
  });

  it("позначає систему, для якої ще немає розрахунку", async () => {
    const user = userEvent.setup();
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();
    await openBlock(user);

    expect(screen.getByText("Ведична астрологія")).toBeTruthy();
    expect(screen.getByText("скоро")).toBeTruthy();
  });

  /**
   * Параметри системи без формули — це **обіцянка**, а не порожній список:
   * реєстр дає перелік заздалегідь (`2026-10-09-dateanalysis-13`). Вітрина
   * показує його так само, як у рахованої, лише з позначкою «скоро».
   */
  it("не рахована система показує свої параметри після дотику", async () => {
    const user = userEvent.setup();
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();
    await openBlock(user);

    expect(screen.queryByText("Сидеричний знак Сонця")).toBeNull();
    await openSystem(user, "Ведична астрологія");
    expect(screen.getByText("Сидеричний знак Сонця")).toBeTruthy();
  });

  it("рахована система без параметрів каже про це вголос", async () => {
    const user = userEvent.setup();
    stubRegistry([{ ...REGISTRY[0], parameters: [] }]);
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();
    await openBlock(user);
    await openSystem(user, "Західна астрологія");

    expect(screen.getByText("Розрахунок цієї системи ще не готовий.")).toBeTruthy();
  });

  it("показує всі системи реєстру, а не першу", async () => {
    const user = userEvent.setup();
    stubRegistry([
      ...REGISTRY,
      { id: "human-design", name: "Дизайн людини", description: "", implemented: false },
    ]);
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();
    await openBlock(user);

    expect(screen.getByText("Західна астрологія")).toBeTruthy();
    expect(screen.getByText("Ведична астрологія")).toBeTruthy();
    expect(screen.getByText("Дизайн людини")).toBeTruthy();
  });

  it("розкриває пояснення параметра після дотику", async () => {
    const user = userEvent.setup();
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();
    await openBlock(user);
    await openSystem(user, "Західна астрологія");

    // До дотику пояснення немає: параметрів у системі багато, і розкриті тіла
    // роблять із переліку полотно.
    expect(screen.queryByText("Сонце в знаку зодіаку: основа характеру.")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Знак Сонця" }));
    expect(screen.getByText("Сонце в знаку зодіаку: основа характеру.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Знак Сонця" }));
    expect(screen.queryByText("Сонце в знаку зодіаку: основа характеру.")).toBeNull();
  });

  it("параметр без пояснення не вдає кнопку", async () => {
    const user = userEvent.setup();
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();
    await openBlock(user);
    await openSystem(user, "Західна астрологія");

    expect(screen.queryByRole("button", { name: "Наближений градус Сонця" })).toBeNull();
    expect(screen.getByText("Наближений градус Сонця")).toBeTruthy();
  });

  it("порожній реєстр каже про себе, а не мовчить", async () => {
    const user = userEvent.setup();
    stubRegistry([]);
    render(<AnalysisSystemsBlock {...props()} />);
    await flush();
    await openBlock(user);

    expect(screen.getByText("Систем аналізу поки немає.")).toBeTruthy();
  });

  /**
   * Склад сторінки, який лежить у базі, рендериться цілком: вітрина як блок
   * Page Builder, а не як окремий компонент.
   */
  it("рендериться у складі сторінки", async () => {
    const user = userEvent.setup();
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

    await openBlock(user);
    expect(screen.getByText("Західна астрологія")).toBeTruthy();
  });

  it("бере заголовок із props, а без нього — типовий", async () => {
    render(<AnalysisSystemsBlock {...props({ title: "Методи аналізу" })} />);
    await flush();
    expect(screen.getByRole("heading", { name: "Методи аналізу" })).toBeTruthy();
  });
});
