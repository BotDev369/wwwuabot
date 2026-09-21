/**
 * `RpsGame` — арена: два слоти (ви й бот), рахунок точками й три предмети.
 *
 * **Знак, а не слово.** «Камінь, ножиці, папір» — гра на розпізнавання з
 * першого погляду: людина бачить, що викинув бот, і вже потім читає, хто взяв
 * раунд. Тому в слотах стоять **предмети** (`rock` / `scissors` / `paper`), а
 * слова лишились на кнопках і в підписах.
 *
 * **Рахунок — точки, не числа.** «Ви 1 · бот 1 · до 3 перемог» доводилось
 * читати; дві доріжки з трьох точок видно одним поглядом, і порожні точки самі
 * показують, скільки лишилось.
 *
 * **Показ — подія, а не мить.** Поки бот «вибирає», його слот тремтить і
 * перебирає предмети; результат зʼявляється знизу. Це та сама пауза, що в
 * житті: рука летить — потім видно, що вийшло (`useRps`).
 *
 * @module web-platform-dev/src/pages/games/RpsGame
 */

import type { ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import { RPS_CHOICES, RPS_TARGET, choiceLabel, type RpsChoice, type RpsOutcome } from "./rps";
import { useRps } from "./useRps";

const CHOICE_ICONS: Record<RpsChoice, IconName> = {
  rock: "rock",
  scissors: "scissors",
  paper: "paper",
};

/** Що сказати в рядку результату — словами людини, а не нашого стану. */
const OUTCOME_TEXT: Record<RpsOutcome, string> = {
  win: "Раунд ваш",
  lose: "Раунд бота",
  draw: "Нічия",
};

/** Тон рядка — класами, а не кольором у розмітці (він же колір стану). */
const TONE_CLASS: Record<RpsOutcome, string> = {
  win: " wb-game-result--win",
  lose: " wb-game-result--lose",
  draw: " wb-game-result--draw",
};

/** Хто взяв раунд: своєму слоту — `won`, чужому — `lost`, нічия — обом `idle`. */
function tileState(outcome: RpsOutcome | null, mine: boolean): "idle" | "won" | "lost" {
  if (outcome === null || outcome === "draw") return "idle";
  const won = mine ? outcome === "win" : outcome === "lose";
  return won ? "won" : "lost";
}

/** Слот арени: предмет, підпис і стан. Порожній слот — пунктирна рамка. */
function Tile({
  choice,
  label,
  mine,
  state,
  rolling,
}: {
  choice: RpsChoice | null;
  label: string;
  /** Свій слот має акцентне тло — так видно, котрий із двох твій. */
  mine?: boolean;
  state: "idle" | "won" | "lost";
  /** Слот бота під час вибору: тремтить, а не мовчить. */
  rolling?: boolean;
}): ReactElement {
  let className = "wb-game-tile";
  if (choice === null) className += " wb-game-tile--empty";
  else if (mine) className += " wb-game-tile--mine";
  if (state === "won") className += " wb-game-tile--won";
  if (state === "lost") className += " wb-game-tile--lost";

  return (
    <div className={className}>
      {/* Знак зʼявляється стрибком — це та сама мить, коли предмет «упав» */}
      <span className={rolling ? "wb-game-shake" : choice ? "wb-game-pop" : undefined}>
        {choice && <Icon name={CHOICE_ICONS[choice]} size={44} />}
      </span>
      <span className="wb-game-tile-label">{choice ? choiceLabel(choice) : label}</span>
    </div>
  );
}

/** Доріжка точок: залиті — узяті раунди, порожні — ті, що лишились. */
function PipsRow({ filled, of }: { filled: number; of: number }): ReactElement {
  return (
    // Точки — це число, показане знаками: для того, хто їх не бачить, воно
    // мусить лишитись числом, а не порожнім рядом квадратів.
    <span className="wb-game-pips-row" role="img" aria-label={`${filled} з ${of}`}>
      {Array.from({ length: of }, (_, index) => (
        <span
          key={index}
          className={`wb-game-pip${index < filled ? " wb-game-pip--filled" : ""}`}
        />
      ))}
    </span>
  );
}

export function RpsGame(): ReactElement {
  const game = useRps();
  const rolling = game.phase === "rolling";
  const mineState = tileState(game.outcome, true);
  const botState = tileState(game.outcome, false);

  // Порядок значень той самий, що в житті: спершу «що сталося», потім — чому
  // саме так. Поки хід не зроблено, рядок каже, що робити.
  let text = "Ваш хід — оберіть предмет";
  let tone = "";
  if (rolling) text = "Бот вибирає…";
  else if (game.outcome) {
    text = OUTCOME_TEXT[game.outcome];
    tone = TONE_CLASS[game.outcome];
  }
  if (game.finished) {
    const won = game.wins > game.losses;
    text = won ? "Ви виграли партію" : "Бот виграв партію";
    tone = won ? TONE_CLASS.win : TONE_CLASS.lose;
  }

  return (
    <div className="wb-game">
      <div className="wb-game-pips">
        <span className="wb-game-pips-label">Ви</span>
        <PipsRow filled={game.wins} of={RPS_TARGET} />
        <span className="wb-game-pips-label">Бот</span>
        <PipsRow filled={game.losses} of={RPS_TARGET} />
      </div>

      <div className="wb-game-arena">
        <Tile choice={game.player} label="Ваш предмет" mine state={mineState} />
        <span className="wb-game-versus">проти</span>
        <Tile choice={game.bot ?? game.rolling} label="Бот" state={botState} rolling={rolling} />
      </div>

      <p className={`wb-game-result${tone}`}>{text}</p>

      <div className="wb-game-choices">
        {RPS_CHOICES.map((choice) => (
          <button
            key={choice.key}
            type="button"
            className="wb-game-choice"
            // Під час вибору бота ходити нічим — раунд уже триває
            disabled={game.finished || rolling}
            onClick={() => game.play(choice.key)}
          >
            <Icon name={CHOICE_ICONS[choice.key]} size={26} />
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
