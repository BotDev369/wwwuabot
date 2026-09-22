/**
 * `NupogodiGame` — «Ну, погоди!»: курник, курки на сідалах і вовк із кошиком.
 *
 * **Видно, а не прочитано.** Яйце котиться доріжкою від курки до кошика — і
 * поки воно котиться, видно, у яку доріжку треба встигнути. Вовк **іде**
 * смугами, а не стрибає: місце треба передбачити, і це єдина причина, чому
 * гра є грою, а не реакцією на подію.
 *
 * **Хто впіймав — вирішує не розмітка.** Позиція кошика приходить із правил
 * (`laneOf`), і тут вона лише малюється: якби «чи впіймав» рахував компонент,
 * те саме рішення жило б у двох місцях — і розійшлося б із життями на екрані.
 *
 * **Звук — на подію, а не на стан.** Подія приходить один раз і має власний
 * номер (`flash.id`): саме тому вимкнення звуку посеред партії не переграє
 * останнє яйце.
 *
 * **Три входи, один хід.** Дотик по доріжці (палець), стрілки (ноутбук) і
 * пульт знизу (той, хто не здогадався ні про перше, ні про друге) роблять те
 * саме: ставлять ціль. Уся гра — у тому, коли цю ціль поставити.
 *
 * @module web-platform-dev/src/pages/games/NupogodiGame
 */

import { useEffect, useRef, type ReactElement, type ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import { LANES, dropPercent, lanePercent } from "./henhouse";
import { START_LIVES, type NupogodiEvent, type NupogodiState } from "./nupogodi";
import { EGGS, plural } from "./plural";
import { type GameSound } from "./sound";
import { useGameSound } from "./useGameSound";
import { useNupogodi, type NupogodiFlash } from "./useNupogodi";

/** Що сказати словами про те, що щойно сталось. Тон — класами, не кольором у розмітці. */
function statusOf(
  state: NupogodiState,
  flash: NupogodiFlash | null,
): { text: ReactNode; tone: string } {
  if (state.over) {
    return {
      text: `Курник затих: у кошику ${state.caught} ${plural(state.caught, EGGS)}`,
      tone: " wb-game-result--lose",
    };
  }
  if (!flash) return { text: "Курки несуться — підставляйте кошик", tone: "" };

  const { event } = flash;
  if (event.type === "level") return { text: `Швидше! Рівень ${event.level}`, tone: "" };
  if (event.type === "missed") {
    return { text: "Яйце розбилось — мінус життя", tone: " wb-game-result--lose" };
  }
  return { text: "Яйце в кошику!", tone: " wb-game-result--win" };
}

/** Настрій вовка: удача — стрибок, промах — хитання. */
function moodOf(event: NupogodiEvent | undefined): string {
  if (event?.type === "caught") return " wb-nupogodi-wolf--catch";
  if (event?.type === "missed") return " wb-nupogodi-wolf--miss";
  return "";
}

/** Що гра каже вголос. Рівень звучить окремо: це не «впіймав», а «швидше». */
function soundOf(event: NupogodiEvent): GameSound {
  if (event.type === "level") return "level";
  return event.type === "caught" ? "catch" : "miss";
}

/** Життя — слотами: порожній слот читається як «одне вже втрачено», числа — ні. */
function Lives({ left }: { left: number }): ReactElement {
  return (
    <span className="wb-nupogodi-lives">
      {Array.from({ length: START_LIVES }, (_, at) => (
        <span
          // Слот — не список подій, а місце: ключ за номером тут єдиний можливий
          key={at}
          role="img"
          aria-label={at < left ? "життя" : "життя втрачено"}
          className={`wb-nupogodi-life${at < left ? "" : " wb-nupogodi-life--spent"}`}
        >
          <Icon name="heart" size={14} />
        </span>
      ))}
    </span>
  );
}

export function NupogodiGame(): ReactElement {
  const { state, flash, moveTo, step, reset } = useNupogodi();
  const { on: sound, toggle: toggleSound, play } = useGameSound();
  const event = flash?.event;
  const over = state.over;

  // Звук на подію: номер береже від повтору, бо ефект перезапускається, коли
  // людина вмикає звук назад
  const sounded = useRef(0);
  useEffect(() => {
    if (!flash || flash.id === sounded.current) return;
    sounded.current = flash.id;
    play(soundOf(flash.event));
  }, [flash, play]);

  const ended = useRef(false);
  useEffect(() => {
    if (over === ended.current) return;
    ended.current = over;
    if (over) play("over");
  }, [over, play]);

  // Стрілки — для ноутбука. На телефоні хід робить дотик по доріжці, і цей
  // слухач нічому не заважає: він мовчить, поки натиснуто не стрілку.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const status = statusOf(state, flash);
  // Ключ від події: рух мусить **починатись**, а той самий вузол анімацію
  // вдруге не запускає — це та сама причина, що в «2048» і камені-ножицях.
  const miss = event?.type === "missed" ? event : null;

  return (
    <div className="wb-game">
      <div className="wb-game-score-chips">
        <span className="wb-game-score-chip wb-game-score-chip--won">Очки: {state.score}</span>
        <span className="wb-game-score-chip">Рівень {state.level}</span>
        <Lives left={state.lives} />
        <button
          type="button"
          className="wb-nupogodi-sound"
          aria-label={sound ? "Вимкнути звук" : "Увімкнути звук"}
          aria-pressed={sound}
          onClick={toggleSound}
        >
          <Icon name={sound ? "sound-on" : "sound-off"} size={16} />
        </button>
      </div>

      <p className={`wb-game-result${status.tone}`}>
        {flash || state.over ? (
          <span className="wb-game-pop" key={state.over ? "end" : flash?.id}>
            {status.text}
          </span>
        ) : (
          status.text
        )}
      </p>

      <div className="wb-nupogodi" role="group" aria-label="Курник">
        {/* Сідала: у кожної курки своя доріжка, тож видно, звідки чекати яйце */}
        <div className="wb-nupogodi-hens">
          {Array.from({ length: LANES }, (_, lane) => (
            <span
              key={lane}
              className="wb-nupogodi-hen"
              style={{ left: `${lanePercent(lane)}%` }}
              role="img"
              aria-label={`Курка ${lane + 1}`}
            >
              <Icon name="hen" size={30} />
            </span>
          ))}
        </div>

        {/* Доріжки: тут котиться все, що знесла курка. Низ — це кошик */}
        <div className="wb-nupogodi-fall">
          {state.eggs.map((egg) => (
            <span
              key={egg.id}
              className="wb-nupogodi-egg"
              style={{
                left: `${lanePercent(egg.lane)}%`,
                top: `${dropPercent(egg.drop)}%`,
              }}
            >
              <Icon name="egg" size={22} />
            </span>
          ))}
        </div>

        {/* Подвір'я: вовк стоїть на траві, кошик — під самими доріжками */}
        <div className="wb-nupogodi-ground">
          {miss && (
            <span
              key={flash?.id}
              className="wb-nupogodi-crack"
              style={{ left: `${lanePercent(miss.lane)}%` }}
            />
          )}
          <span
            key={flash?.id ?? 0}
            className={`wb-nupogodi-wolf${moodOf(event)}`}
            style={{ left: `${lanePercent(state.wolf)}%` }}
          >
            <span className="wb-nupogodi-basket" />
          </span>
        </div>

        {/* Доріжки: дотик ставить ціль. Кнопки прозорі — вони адреса, а не вигляд */}
        <div className="wb-nupogodi-lanes">
          {Array.from({ length: LANES }, (_, lane) => (
            <button
              key={lane}
              type="button"
              className="wb-nupogodi-lane"
              aria-label={`Доріжка ${lane + 1}`}
              disabled={state.over}
              onClick={() => moveTo(lane)}
            />
          ))}
        </div>
      </div>

      <div className="wb-num-pad">
        <button
          type="button"
          className="wb-num-key"
          aria-label="Лівіше"
          disabled={state.over}
          onClick={() => step(-1)}
        >
          <Icon name="arrow-left" size={22} />
        </button>
        <button
          type="button"
          className="wb-num-key"
          aria-label="Правіше"
          disabled={state.over}
          onClick={() => step(1)}
        >
          <Icon name="arrow-right" size={22} />
        </button>
      </div>

      <div className="wb-game-actions">
        <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={reset}>
          <Icon name="refresh" size={16} />
          {state.over ? "Ще партія" : "Спочатку"}
        </button>
      </div>
    </div>
  );
}
