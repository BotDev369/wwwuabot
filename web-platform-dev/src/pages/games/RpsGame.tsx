/**
 * `RpsGame` — «камінь, ножиці, папір»: три кнопки, рахунок і останній раунд.
 *
 * **Вибір — три рівні кнопки, а не список.** У грі їх рівно три, і людина
 * знає їх напамʼять: рівні слоти дають однакові за розміром цілі для пальця й
 * не змушують читати, де що.
 *
 * **Рахунок — до трьох перемог** (`RPS_TARGET`), і це сказано словами: без
 * цього партія без кінця читалась би як «рахунок росте, і що?».
 *
 * @module web-platform-dev/src/pages/games/RpsGame
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { RPS_CHOICES, RPS_TARGET, choiceLabel, type RpsOutcome } from "./rps";
import { useRps } from "./useRps";

/** Результат раунду — словами. «Нічия» тут не помилка, а половина партії. */
const OUTCOME_TEXT: Record<RpsOutcome, string> = {
  win: "Раунд ваш",
  lose: "Раунд бота",
  draw: "Нічия",
};

export function RpsGame(): ReactElement {
  const game = useRps();
  const result = game.finished
    ? game.wins > game.losses
      ? "Ви виграли партію"
      : "Бот виграв партію"
    : null;

  return (
    <div className="wb-game">
      <p className="wb-game-score">
        Ви {game.wins} · бот {game.losses} · до {RPS_TARGET} перемог
      </p>

      <p className="wb-game-status">
        {result ?? (game.round === null ? "Ваш хід" : OUTCOME_TEXT[game.round.outcome])}
      </p>

      {game.round !== null && (
        <p className="wb-game-round">
          Ви: {choiceLabel(game.round.player)} · бот: {choiceLabel(game.round.bot)}
        </p>
      )}

      <div className="wb-game-choices">
        {RPS_CHOICES.map((choice) => (
          <button
            key={choice.key}
            type="button"
            className="wb-btn wb-btn-secondary wb-btn-sm"
            disabled={game.finished}
            onClick={() => game.play(choice.key)}
          >
            {choice.label}
          </button>
        ))}
      </div>

      <div className="wb-game-actions">
        <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={game.reset}>
          <Icon name="refresh" size={16} />
          {game.finished ? "Ще партія" : "Спочатку"}
        </button>
      </div>
    </div>
  );
}
