/**
 * `/space/g/:key` — екран однієї гри.
 *
 * **У партії є адреса.** На неї веде пункт вкладки «Ігри», вона лишається в
 * історії (тож «назад» вертає до списку, а не виводить із Простору), і її
 * можна надіслати. Поверхня, що відкриває гру, не мала б жодного з трьох —
 * це те саме правило, за яким у сторінку переїхала тема (`AGENTS.md` §8).
 *
 * **Невідомий ключ не мовчить.** `/space/g/шахи` — це не порожній екран і не
 * спроба знайти сторінку контенту: людина бачить, що такої гри немає, і
 * кнопку до списку. Catch-all у роутері стоїть після цього шляху, тож сюди
 * потрапляє тільки він.
 *
 * @module web-platform-dev/src/pages/games/SpaceGamePage
 */

import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { spaceTabPath } from "../space-tabs";
import { GameView } from "./GameView";
import { gameOption } from "./games";

/** Шапка екрана однакова і для гри, і для «такої гри немає». */
function Head({ title, onBack }: { title: string; onBack: () => void }): ReactElement {
  return (
    <div className="wb-page-head">
      <h1 className="wb-page-title">
        <button type="button" className="wb-close-btn" onClick={onBack} aria-label="Назад">
          <Icon name="arrow-left" size={18} />
        </button>
        {title}
      </h1>
    </div>
  );
}

export function SpaceGamePage(): ReactElement {
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
        <Head title="Ігри" onBack={back} />
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="grid" size={32} />
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
    <div className="wb-page">
      <Head title={game.label} onBack={back} />
      <GameView game={game.key} />
    </div>
  );
}
