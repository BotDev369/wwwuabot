/**
 * `TicTacToeGame` — дошка: девʼять клітинок, рядок результату й рахунок.
 *
 * Розмітка лише малює стан із хука (`useTicTacToe`): правила живуть у
 * `tictactoe.ts`, хід бота — у хуку, а компонент знає тільки, куди натиснули.
 *
 * **Знаки — `Icon`, а не літери.** «✕» і «○» як текст залежать від шрифту й
 * розʼїжджаються разом із ним (а шрифт у нас — вибір людини); іконка тримає
 * розмір і товщину однаковими в будь-якій темі.
 *
 * **Кожен знак зʼявляється стрибком, лінія дихає.** Це не прикраси: у партії
 * на дошці важливо бачити, **що саме** щойно сталося — і де саме тебе закрили.
 * Хід бота приходить у ту саму мить, що й твій, тож без руху два знаки просто
 * «вже стоять».
 *
 * **Рахунок — чипсами зі знаками**, а не рядком «виграно 3 · програно 1»:
 * три числа з підписами доводилось читати, а три знаки з числами видно одразу.
 *
 * @module web-platform-dev/src/pages/games/TicTacToeGame
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { HUMAN, type Cell } from "./tictactoe";
import { useTicTacToe, type TicTacToeScore } from "./useTicTacToe";

/** Що написати в рядку результату — словами людини, а не нашого стану. */
const STATUS = {
  won: { text: "Ви виграли!", tone: "win" },
  lost: { text: "Бот виграв партію", tone: "lose" },
  draw: { text: "Нічия", tone: "draw" },
} as const;

/** Тон рядка — класами: колір стану не живе в розмітці. */
const TONE_CLASS = {
  win: " wb-game-result--win",
  lose: " wb-game-result--lose",
  draw: " wb-game-result--draw",
} as const;

/** Рахунок партій: свої перемоги — хрестиком, чужі — нуликом, нічиї — рискою. */
function ScoreChips({ score }: { score: TicTacToeScore }): ReactElement {
  return (
    <div className="wb-game-score-chips">
      <span className="wb-game-score-chip wb-game-score-chip--won">
        <Icon name="mark-x" size={14} />
        {score.won}
      </span>
      <span className="wb-game-score-chip">
        <Icon name="mark-o" size={14} />
        {score.lost}
      </span>
      <span className="wb-game-score-chip">
        <Icon name="minus" size={14} />
        {score.draw}
      </span>
    </div>
  );
}

export function TicTacToeGame(): ReactElement {
  const game = useTicTacToe();
  const over = game.result !== null;
  const status = game.result === null ? null : STATUS[game.result];
  const toneClass = status ? TONE_CLASS[status.tone] : "";

  return (
    <div className="wb-game">
      {/* Стан іде ПЕРЕД дошкою: у партії на одного питання «чий хід» стоїть
          першим, а дошка його не пояснює. */}
      <p className={`wb-game-result${toneClass}`}>
        {/* Ключ від тексту — щоб результат **зʼявлявся** стрибком: без нього
            React міняє лише вміст, і руху не видно. */}
        {status ? (
          <span className="wb-game-pop" key={status.text}>
            {status.text}
          </span>
        ) : (
          "Ваш хід — хрестики"
        )}
      </p>

      <div className="wb-game-board">
        {game.board.map((cell: Cell, index: number) => {
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
              {cell && (
                <span className="wb-game-pop">
                  <Icon name={cell === "x" ? "mark-x" : "mark-o"} size={38} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ScoreChips score={game.score} />

      <div className="wb-game-actions">
        <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={game.reset}>
          <Icon name="refresh" size={16} />
          {over ? "Ще партія" : "Спочатку"}
        </button>
      </div>
    </div>
  );
}
