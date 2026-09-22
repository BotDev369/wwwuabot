/**
 * `FishingGame` — «Весела рибалка»: ополонка, вовк із ведром і те, що з неї
 * вистрибує.
 *
 * **Видно, а не прочитано.** Рибина йде дугою (`arcOf`) — тобто в неї є дві
 * фази, угору й униз, і саме тому зрозуміло, коли ведро мусить бути на місці.
 * Вовк **іде** смугами, а не стрибає: місце треба передбачити, і це єдина
 * причина, чому гра є грою, а не реакцією на подію.
 *
 * **Хто впіймав — вирішує не розмітка.** Позиція ведра приходить із правил
 * (`laneOf`), і тут вона лише малюється: якби «чи впіймав» рахував компонент,
 * те саме рішення жило б у двох місцях — і розійшлося б із життями на екрані.
 *
 * **Три входи, один хід.** Дотик по смузі (палець), стрілки (ноутбук) і пульт
 * знизу (той, хто не здогадався ні про перше, ні про друге) роблять те саме:
 * ставлять ціль. Уся гра — у тому, коли цю ціль поставити.
 *
 * @module web-platform-dev/src/pages/games/FishingGame
 */

import { useEffect, type ReactElement, type ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import { START_LIVES, type FishingEvent, type FishingState } from "./fishing";
import { LANES, arcOf, lanePercent } from "./fishing-pond";
import { FISH, plural } from "./plural";
import { useFishing, type FishingFlash } from "./useFishing";

/** Що сказати словами про те, що щойно сталось. Тон — класами, не кольором у розмітці. */
function statusOf(
  state: FishingState,
  flash: FishingFlash | null,
): { text: ReactNode; tone: string } {
  if (state.over) {
    return {
      text: `Ведро порожнє: спіймано ${state.caught} ${plural(state.caught, FISH)}`,
      tone: " wb-game-result--lose",
    };
  }
  if (!flash) return { text: "Підставляйте ведро — риба стрибає з ополонки", tone: "" };

  const { event } = flash;
  if (event.type === "level") return { text: `Швидше! Рівень ${event.level}`, tone: "" };
  if (event.type === "missed") {
    return { text: "Риба втекла — мінус життя", tone: " wb-game-result--lose" };
  }
  if (event.kind === "fish") return { text: "Риба у ведрі!", tone: " wb-game-result--win" };
  return { text: "Чобіт у ведрі — мінус життя", tone: " wb-game-result--lose" };
}

/** Настрій вовка: удача — стрибок, промах — хитання. */
function moodOf(event: FishingEvent | undefined): string {
  if (event?.type === "caught") return " wb-fishing-wolf--catch";
  if (event?.type === "missed") return " wb-fishing-wolf--miss";
  return "";
}

/** Життя — слотами: порожній слот читається як «одне вже втрачено», числа — ні. */
function Lives({ left }: { left: number }): ReactElement {
  return (
    <span className="wb-fishing-lives">
      {Array.from({ length: START_LIVES }, (_, at) => (
        <span
          // Слот — не список подій, а місце: ключ за номером тут єдиний можливий
          key={at}
          role="img"
          aria-label={at < left ? "життя" : "життя втрачено"}
          className={`wb-fishing-life${at < left ? "" : " wb-fishing-life--spent"}`}
        >
          <Icon name="heart" size={14} />
        </span>
      ))}
    </span>
  );
}

export function FishingGame(): ReactElement {
  const { state, flash, moveTo, step, reset } = useFishing();
  const event = flash?.event;

  // Стрілки — для ноутбука. На телефоні хід робить дотик по смузі, і цей
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
  const splash = event && event.type !== "level" ? event : null;

  return (
    <div className="wb-game">
      <div className="wb-game-score-chips">
        <span className="wb-game-score-chip wb-game-score-chip--won">Очки: {state.score}</span>
        <span className="wb-game-score-chip">Рівень {state.level}</span>
        <Lives left={state.lives} />
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

      <div className="wb-fishing" role="group" aria-label="Ополонка">
        {/* Повітря: тут летить усе, що вистрибнуло. Низ цієї області — вода */}
        <div className="wb-fishing-air">
          {state.leaps.map((leap) => (
            <span
              key={leap.id}
              className={`wb-fishing-item wb-fishing-item--${leap.kind}`}
              style={{
                left: `${lanePercent(leap.lane)}%`,
                bottom: `${arcOf(leap.air) * 100}%`,
                // Нахил у бік руху: риба, що падає, виглядає інакше, ніж та, що злетіла
                transform: `translateX(-50%) rotate(${(leap.air - 0.5) * 40}deg)`,
              }}
            >
              <Icon name={leap.kind === "fish" ? "fish" : "boot"} size={26} />
            </span>
          ))}
        </div>

        {/* Крига: вовк стоїть на ній, ведро — на самій лінії води */}
        <div className="wb-fishing-ice">
          <span className="wb-fishing-hole" />
          {splash && (
            <span
              key={flash?.id}
              className="wb-fishing-splash"
              style={{ left: `${lanePercent(splash.lane)}%` }}
            />
          )}
          <span
            key={flash?.id ?? 0}
            className={`wb-fishing-wolf${moodOf(event)}`}
            style={{ left: `${lanePercent(state.wolf)}%` }}
          >
            <span className="wb-fishing-bucket" />
          </span>
        </div>

        {/* Смуги: дотик ставить ціль. Кнопки прозорі — вони адреса, а не вигляд */}
        <div className="wb-fishing-lanes">
          {Array.from({ length: LANES }, (_, lane) => (
            <button
              key={lane}
              type="button"
              className="wb-fishing-lane"
              aria-label={`Смуга ${lane + 1}`}
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
