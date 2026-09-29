/**
 * Текст зі жирними фрагментами — `**так**`.
 *
 * **Чому не `dangerouslySetInnerHTML`.** Розмітка з джерела — це дані, а дані
 * з джерела рано чи пізно містять чужий текст. `dangerouslySetInnerHTML` перетворив
 * б це на вектор для XSS заради одного зірочкового маркера. Тут рядок просто
 * ділиться на частини, а `**` стає `<strong>`.
 *
 * Жодного стану, жодних ефектів: компонент лише рахує React-вузли.
 *
 * @module web-platform-dev/src/pages/assessments/BoldText
 */

import { Fragment, type ReactElement } from "react";

/** `**жирний**` або звичайний текст; обидва входять у типові тексти джерела. */
export function BoldText({ text }: { text: string }): ReactElement {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, index) => (
        // Індекс — частина послідовності, а не дані: ключ стабільний, доки
        // текст не зміниться, тож перемикання між тестами не змішує вузли.
        <Fragment key={index}>{index % 2 === 1 ? <strong>{part}</strong> : part}</Fragment>
      ))}
    </>
  );
}
