/**
 * Коробка сайдбара: закриття — у верхньому рядку, і там же може стояти своє
 * (тумблер теми). Це єдине місце, де меню платформи й адмінки мусять збігтись.
 *
 * @module packages/ui/src/nav/Sidebar.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SideBar } from "./Sidebar";

describe("SideBar", () => {
  it("ставить своє перед хрестиком у тому самому рядку", () => {
    const html = renderToStaticMarkup(
      <SideBar onClose={() => undefined} closeExtra={<span className="probe">Тема</span>}>
        <p>Пункти</p>
      </SideBar>,
    );

    expect(html).toContain("wb-nav-close-row");
    expect(html.indexOf("probe")).toBeLessThan(html.indexOf("wb-close-btn"));
  });

  it("без закриття не малює рядка: у потоці діє тумблер шапки", () => {
    const html = renderToStaticMarkup(
      <SideBar closeExtra={<span className="probe">Тема</span>}>
        <p>Пункти</p>
      </SideBar>,
    );

    expect(html).not.toContain("wb-nav-close-row");
    expect(html).toContain("Пункти");
  });

  it("згорнута коробка не малює ні рядка закриття, ні підписів", () => {
    const html = renderToStaticMarkup(
      <SideBar collapsed onClose={() => undefined}>
        <p>Пункти</p>
      </SideBar>,
    );

    expect(html).toContain("wb-nav--collapsed");
    expect(html).not.toContain("wb-nav-close-row");
  });
});
