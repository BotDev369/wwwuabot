/**
 * Сторож панелі вигляду: **що в ній є і що в ній бути не має**.
 *
 * Тут ламається дві речі одразу, і обидві мовчки. Перша — склад: якщо зникне
 * другий рядок пункту («що обрано»), меню перетвориться на два заголовки без
 * змісту, і людина не бачитиме свого вибору, не розкриваючи пункт. Друга —
 * рядок дій: кнопка без пари («Застосувати» без «Відмінити») означає б, що
 * скасувати вибір нічем.
 *
 * **Вибору стилю тут немає й не має бути.** Стиль продукту — константа
 * (`styles/registry`), тому кнопка «Material» у панелі була б вибором, який
 * нічого не змінює.
 *
 * Рендер — справжній (`renderToStaticMarkup`): правило панелі цікаве тим, що
 * його видно в розмітці — `aria-expanded` і підписи кнопок.
 *
 * @module packages/shared/src/components/theme/ThemeColorPanel.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeColorPanel } from "./ThemeColorPanel";

function render(): string {
  return renderToStaticMarkup(<ThemeColorPanel onClose={() => undefined} />);
}

/** Голови пунктів панелі: їх рівно два, і саме вони — акордеони. */
function sectionHeads(html: string): string[] {
  return html.match(/<button[^>]*wb-theme-section-head[^>]*>/g) ?? [];
}

describe("панель вигляду", () => {
  it("⛔ два пункти: кольори й шрифт, і жодного вибору стилю", () => {
    const html = render();

    expect(html).toContain("Кольори теми");
    expect(html).toContain("Шрифт теми");
    // Стиль продукту — константа: кнопка, що не змінює нічого, тут шкодить.
    expect(html).not.toContain("Material");
    expect(html).not.toContain("Apple");
  });

  it("«Кольори теми» відкритий одразу, шрифт — згорнутий", () => {
    const heads = sectionHeads(render());

    // За кольори приходять частіше: закритий пункт із одним заголовком не
    // каже нічого про вибір, а відкритий — одразу показує і кольори, і палітри.
    expect(heads).toHaveLength(2);
    expect(heads.filter((head) => head.includes('aria-expanded="true"'))).toHaveLength(1);
    expect(heads.filter((head) => head.includes('aria-expanded="false"'))).toHaveLength(1);
  });

  it("⛔ останній рядок — рівно «Відмінити» та «Застосувати»", () => {
    const html = render();

    expect(html).toContain("Відмінити");
    expect(html).toContain("Застосувати");
    // Кнопок дій дві: «Скинути» чи «Зберегти» тут немає — скасування вже є.
    expect(html).not.toContain("Скинути");
    expect(html).not.toContain("Зберегти");
  });
});
