/**
 * Сторож єдиної картки теми: **що в ній є і чого в ній бути не має**.
 *
 * Картка проста, але три її правила ламаються мовчки. Перше — колір: якщо
 * `--scheme-*` не дійдуть до тла чи підписів, картка перестає бути прев'ю теми й
 * стає сірою плиткою з текстом. Друге — дотик: картка без кнопки-застосування
 * мусить лишатися кнопкою сама, інакше вибір знову не застосується. Третє —
 * меню: воно власної теми, тож у шаблонної й чужої картки кутка «···» бути
 * не повинно (сервер однаково відповів би 404).
 *
 * Рендер — справжній (`renderToStaticMarkup`), бо правило тут видиме в розмітці.
 *
 * @module packages/shared/src/components/theme/ThemeCard.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { UserColors } from "../../styles/user-colors";
import { THEME_OWN_ACTIONS, ThemeCard } from "./ThemeCard";

const NIGHT: UserColors = { bg: "#0b0b0f", text: "#f2f3f7", accent: "#7aa2ff" };

describe("картка теми", () => {
  it("прев'ю — три кольори самої теми, а не наші", () => {
    const html = renderToStaticMarkup(
      <ThemeCard name="Ніч" colors={NIGHT} font="" onApply={() => undefined} />,
    );

    // Тло, текст і акцент приходять змінними: картка показує тему, а не себе.
    expect(html).toContain("--scheme-bg:#0b0b0f");
    expect(html).toContain("--scheme-text:#f2f3f7");
    expect(html).toContain("--scheme-accent:#7aa2ff");
    expect(html).not.toContain("wb-btn");
  });

  it("⛔ дотик до картки і є застосування — кнопки «Застосувати» немає", () => {
    const html = renderToStaticMarkup(
      <ThemeCard name="Ніч" colors={NIGHT} font="" onApply={() => undefined} />,
    );

    expect(html).toContain("wb-theme-card-hit");
    expect(html).not.toContain("Застосувати");
  });

  it("⛔ «як у стилі» на кожній картці — шум; шрифт показує себе зразком", () => {
    const html = renderToStaticMarkup(
      <ThemeCard name="Ніч" colors={NIGHT} font="" onApply={() => undefined} />,
    );

    // Одинадцять однакових підписів повторювали те саме слово. Зразок «Аа»
    // каже це формою й лишає акцентний колір на місці.
    expect(html).not.toContain("Як у стилі");
    expect(html).toContain("wb-theme-card-glyph");
  });

  it("свою родину картка називає й набирає нею", () => {
    const html = renderToStaticMarkup(
      <ThemeCard name="Ніч" colors={NIGHT} font="lora" onApply={() => undefined} />,
    );

    // Назва потрібна тоді, коли вона щось розрізняє: тема зі своїм шрифтом.
    expect(html).toContain("Lora");
    expect(html).toContain("font-family");
  });

  it("⛔ меню дій є лише у власної теми", () => {
    const own = renderToStaticMarkup(
      <ThemeCard
        name="Моя"
        colors={NIGHT}
        font=""
        onApply={() => undefined}
        actions={THEME_OWN_ACTIONS}
        onAction={() => undefined}
      />,
    );
    const foreign = renderToStaticMarkup(
      <ThemeCard name="Чужа" colors={NIGHT} font="" onApply={() => undefined} />,
    );

    expect(own).toContain("wb-theme-card-menu");
    expect(foreign).not.toContain("wb-theme-card-menu");
    // Меню закрите до дотику: список пунктів у розмітці без «···» — зайвий.
    expect(own).not.toContain('role="menu"');
  });

  it("⛔ застосована тема каже станом, а не кнопкою", () => {
    const html = renderToStaticMarkup(
      <ThemeCard name="Ніч" colors={NIGHT} font="" applied onApply={() => undefined} />,
    );

    expect(html).toContain("wb-theme-card--on");
    expect(html).toContain("wb-theme-card-on");
  });
});
