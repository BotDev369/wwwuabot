/**
 * `GameView` — «ключ гри → її екран», загорнутий у **сцену гри**.
 *
 * Один рядок на гру, і він обовʼязковий для кожної: у `Record<GameKey, …>`
 * забути гру неможливо — компілятор скаже раніше за людину. Це і є причина,
 * чому тут мапа, а не `switch` у сторінці: `switch` мовчки нічого не показує,
 * а мапа не збереться.
 *
 * **Сцена (`data-game`) — межа власного світу гри.** Атрибут перемикає
 * палітру (`--game-*` у `games.css`), і все всередині нього вже не знає ні
 * `--text-*`, ні `--accent`: тема застосунку сюди не доходить. Так гра може
 * мати власну атмосферу, а розмітка й компоненти лишаються спільними.
 *
 * **Партія йде на весь екран.** Сцена тут — це **середина** екрана: тло,
 * текстура й верхній рядок належать `wb-game-screen` (сторінка гри), який
 * носить той самий `data-game`. Дві поверхні одна на одній дали б подвійну
 * міліметровку, тому сцена всередині екрана власного тла не малює.
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
  return (
    <div className="wb-game-stage" data-game={game}>
      <View />
    </div>
  );
}
