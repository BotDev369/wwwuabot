/**
 * Текст із джерела — **абзацами й списком**, а не суцільною простинею.
 *
 * Чому це окремий компонент. Тексти зі специфікації прийшли з порожніми рядками
 * між абзацами й рядками, що починаються з «—». Раніше це просто показувалося
 * через `white-space: pre-line` в одному `<p>`, і три абзаци ставали стінкою без
 * жодного ритму: не видно, де кінець думки й початок наступної. Людина
 * читає результат — їй потрібен ритм, а не суцільний потік.
 *
 * **Розмітка визначається даними, а не здогадками.** Абзац розбивається за
 * порожнім рядком, рядок списка — за «—» на початку. Жодного «можливо, це
 * заголовок»: формат тексту задано в джерелі, і компонент лише йому
 * підпорядковується.
 *
 * @module web-platform-dev/src/pages/assessments/ProseText
 */

import { Fragment, type ReactElement } from "react";
import { BoldText } from "./BoldText";

/** Маркер рядка списка в джерелі — довге тире з пробілом. */
const BULLET = "— ";

export function ProseText({ text }: { text: string }): ReactElement {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <>
      {blocks.map((block) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const isBullet = (line: string): boolean => line.startsWith(BULLET);
        // **Підпис над списком.** У джерелі «Що робити:» стоїть над маркерами
        // в одному блоці, через що блок ні список, а ні проза — і рендерився
        // стінкою. Рядок, що закінчується двокрапкою, стає підписом.
        const [first, ...rest] = lines;
        const hasLabel = rest.length > 0 && first.endsWith(":") && rest.every(isBullet);
        if (hasLabel || lines.every(isBullet)) {
          const items = hasLabel ? rest : lines;
          return (
            <div className="wb-prose-group" key={block.slice(0, 32)}>
              {hasLabel && <p className="wb-prose-label">{first}</p>}
              <ul className="wb-prose-list">
                {items.map((line) => (
                  <li key={line.slice(0, 32)}>
                    <BoldText text={line.slice(BULLET.length)} />
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <p className="wb-prose" key={block.slice(0, 32)}>
            <BoldText text={lines.join(" ")} />
          </p>
        );
      })}
    </>
  );
}

/** Заголовок блоку всередині тексту — рядок, що закінчується двокрапкою. */
export function ProseLabel({ children }: { children: string }): ReactElement {
  return <span className="wb-prose-label">{children}</span>;
}

/** Порожній фрагмент, аби умовний рендер не ламав форматування. */
export function Nothing(): ReactElement {
  return <Fragment />;
}
