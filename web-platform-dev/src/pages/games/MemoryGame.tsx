/**
 * `MemoryGame` — «Знайди пару»: сітка карток, які перевертаються.
 *
 * **Картка показує знак лише тоді, коли її відкрито.** Закрита — це не
 * порожнеча, а **сорочка**: смугастий бік, який видно, і який не поплутаєш із
 * плиткою. Порожня клітинка читалась би як «тут нічого немає», і дошка
 * виглядала б дірявою.
 *
 * **Знайдена пара лишається відкритою.** Закривати її назад означало б
 * змушувати людину пам'ятати те, що вона вже знайшла: мета гри — не
 * тренувати пам'ять там, де вже все відомо (`found` у хуку).
 *
 * @module web-platform-dev/src/pages/games/MemoryGame
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { SYMBOLS, symbolOf } from "./memory";
import { ATTEMPTS, plural } from "./plural";
import { useMemory } from "./useMemory";

export function MemoryGame(): ReactElement {
  const { cards, open, found, attempts, done, flip, reset } = useMemory();
  const pairs = SYMBOLS.length;
  const opened = found.length / 2;

  return (
    <div className="wb-game">
      <div className="wb-game-score-chips">
        <span className="wb-game-score-chip wb-game-score-chip--won">
          Пари: {opened} з {pairs}
        </span>
        <span className="wb-game-score-chip">
          {attempts} {plural(attempts, ATTEMPTS)}
        </span>
      </div>

      <p className={`wb-game-result${done ? " wb-game-result--win" : ""}`}>
        {done ? (
          <span className="wb-game-pop" key="done">
            Усі пари знайдено!
          </span>
        ) : (
          "Відкривайте по дві картки — однакові лишаються відкритими"
        )}
      </p>

      <div className="wb-memo-grid">
        {cards.map((card, at) => {
          const isFound = found.includes(at);
          const isOpen = isFound || open.includes(at);
          let className = "wb-memo-card";
          if (isOpen) className += " wb-memo-card--open";
          if (isFound) className += " wb-memo-card--found";

          return (
            <button
              // Ключ — номер картки в колоді, а не місце: картки перемішані
              // один раз, і місце кожної вже не змінюється (`deal`).
              key={card.id}
              type="button"
              className={className}
              disabled={isOpen}
              // Знак називається словом, а не іменем іконки: підпис читає
              // людина, а не код (`symbolOf`).
              aria-label={isOpen ? `Картка: ${symbolOf(card).label}` : `Закрита картка ${at + 1}`}
              onClick={() => flip(at)}
            >
              {isOpen ? (
                <Icon name={symbolOf(card).icon} size={30} />
              ) : (
                <span className="wb-memo-back" />
              )}
            </button>
          );
        })}
      </div>

      <div className="wb-game-actions">
        <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={reset}>
          <Icon name="refresh" size={16} />
          {done ? "Ще партія" : "Спочатку"}
        </button>
      </div>
    </div>
  );
}
