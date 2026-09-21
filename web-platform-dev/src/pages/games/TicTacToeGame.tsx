/**
 * `TicTacToeGame` — дошка хрестиків-нуликів: девʼять клітинок, рядок стану й
 * рахунок партій.
 *
 * Розмітка тут лише малює стан із хука (`useTicTacToe`): правила живуть у
 * `tictactoe.ts`, хід бота — у хуку, а компонент знає тільки, куди натиснули.
 *
 * **Знаки — `Icon`, а не літери.** «✕» і «○» як текст залежать від шрифту й
 * розʼїжджаються разом із ним (а шрифт у нас — вибір людини); іконка тримає
 * розмір і товщину однаковими в будь-якій темі.
 *
 * **Переможну лінію видно.** Підсвітка — не прикраса: без неї «ви виграли»
 * лишається словами, а в людини немає способу побачити, де її закрили.
 *
 * @module web-platform-dev/src/pages/games/TicTacToeGame
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { HUMAN, type Cell } from "./tictactoe";
import { useTicTacToe, type TicTacToeResult } from "./useTicTacToe";

/** Що написати в рядку стану — словами людини, а не нашого стану. */
const STATUS: Record<TicTacToeResult, string> = {
  won: "Ви виграли!",
  lost: "Бот виграв",
  draw: "Нічия",
};

function Mark({ cell }: { cell: Cell }): ReactElement | null {
  if (cell === null) return null;
  return <Icon name={cell === "x" ? "x" : "circle"} size={32} />;
}

export function TicTacToeGame(): ReactElement {
  const game = useTicTacToe();
  const over = game.result !== null;

  return (
    <div className="wb-game">
      {/* Стан іде ПЕРЕД дошкою: у партії на одного питання «чий хід» стоїть
          першим, а дошка його не пояснює. */}
      <p className="wb-game-status">
        {game.result === null ? "Ваш хід — хрестики" : STATUS[game.result]}
      </p>

      <div className="wb-game-board">
        {game.board.map((cell, index) => {
          const winning = game.line?.includes(index) ?? false;
          let className = "wb-game-cell";
          if (cell === HUMAN) className += " wb-game-cell--mine";
          if (winning) className += " wb-game-cell--win";
          return (
            <button
              // Клітинка — не список, тож ключ за номером тут єдиний можливий:
              // він же її адреса у правилі лінії.
              key={index}
              type="button"
              className={className}
              disabled={over || cell !== null}
              aria-label={`Клітинка ${index + 1}${cell ? (cell === "x" ? ": хрестик" : ": нулик") : ""}`}
              onClick={() => game.play(index)}
            >
              <Mark cell={cell} />
            </button>
          );
        })}
      </div>

      <p className="wb-game-score">
        Виграно {game.score.won} · програно {game.score.lost} · нічиїх {game.score.draw}
      </p>

      <div className="wb-game-actions">
        <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={game.reset}>
          <Icon name="refresh" size={16} />
          {over ? "Ще партія" : "Спочатку"}
        </button>
      </div>
    </div>
  );
}
