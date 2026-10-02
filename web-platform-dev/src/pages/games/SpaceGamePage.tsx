/**
 * `/space/g/:key` — екран однієї гри. **Повноекранний**.
 *
 * **Партія забирає екран.** Дошки, арени й смуги живуть висотою, а рядок
 * заголовка й футер забирали її найбільше — тож у партії лишається тільки
 * верхній рядок гри (назад і назва), а решту екрана віддано їй. Це не
 * прикраса: на телефоні різниця між «грою в картці» і «грою на весь екран» —
 * це різниця між формою і грою.
 *
 * **У партії є адреса.** На неї веде пункт вкладки «Ігри», вона лишається в
 * історії (тож «назад» вертає до списку, а не виводить із Простору), і її
 * можна надіслати. Поверхня, що відкриває гру, не мала б жодного з трьох —
 * це те саме правило, за яким у сторінку переїхала тема (`AGENTS.md` §8).
 *
 * **Невідомий ключ не мовчить.** `/space/g/шахи` — це не порожній екран і не
 * спроба знайти сторінку контенту: людина бачить, що такої гри немає, і
 * кнопку до списку. Палітри в такої адреси немає (її дає гра), тож помилка
 * живе на звичайній сторінці, а не на сцені.
 *
 * @module web-platform-dev/src/pages/games/SpaceGamePage
 */

import type { ReactElement } from "react";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { spaceTabPath } from "../space-tabs";
import { GameView } from "./GameView";
import { gameOption } from "./games";

export function SpaceGamePage(): ReactElement {
  useScreenChrome({ title: "Ігри" });
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const game = gameOption(key);
  // «Назад» веде у **вкладку** ігор, а не в Простір: адреса вкладки вже має
  // власника (`spaceTabPath`), і другий літерал розійшовся б із нею мовчки.
  const back = (): void => {
    void navigate(spaceTabPath("games"));
  };

  if (!game) {
    return (
      <div className="wb-page">
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="game" size={32} />
          </span>
          <p className="wb-empty-text">Такої гри немає.</p>
          <button type="button" className="wb-btn wb-btn-secondary" onClick={back}>
            До всіх ігор
          </button>
        </div>
      </div>
    );
  }

  return (
    // `data-game` стоїть і тут: палітру носить **екран**, бо він малює тло й
    // верхній рядок, а сцена всередині бере ті самі значення для себе.
    <div className="wb-game-screen" data-game={game.key}>
      {/* Рядок гри — лише її назва: «Назад» уже в хедері, і друга кнопка
          повертала б те саме двома способами. */}
      <div className="wb-game-hud">
        <span className="wb-game-name">{game.label}</span>
      </div>
      <GameView game={game.key} />
    </div>
  );
}
