/**
 * `GameView` — «ключ гри → її екран».
 *
 * Один рядок на гру, і він обовʼязковий для кожної: у `Record<GameKey, …>`
 * забути гру неможливо — компілятор скаже раніше за людину. Це і є причина,
 * чому тут мапа, а не `switch` у сторінці: `switch` мовчки нічого не показує,
 * а мапа не збереться.
 *
 * @module web-platform-dev/src/pages/games/GameView
 */

import type { ReactElement } from "react";
import { GuessGame } from "./GuessGame";
import { RpsGame } from "./RpsGame";
import { TicTacToeGame } from "./TicTacToeGame";
import type { GameKey } from "./games";

const VIEWS: Record<GameKey, () => ReactElement> = {
  tictactoe: TicTacToeGame,
  rps: RpsGame,
  guess: GuessGame,
};

export function GameView({ game }: { game: GameKey }): ReactElement {
  const View = VIEWS[game];
  return <View />;
}
