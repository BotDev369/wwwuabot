/**
 * `Game2048` — дошка 4×4: число в клітинці, очки й пульт.
 *
 * **Плитка — число, а не картинка.** Це гра на арифметику, тож значення
 * мусить читатись одразу: у клітинці стоїть воно саме, а сходинка кольору
 * (`tileLevel`) лише підказує, наскільки воно вже велике.
 *
 * **Хід роблять три речі, і всі три — той самий хід.** Свайп по дошці (для
 * пальця), стрілки клавіатури (для ноутбука) і пульт знизу (для того, хто не
 * здогадався ні про перше, ні про друге). Пульт лишається видимим навіть на
 * телефоні: свайп не очевидний, а чотири стрілки — очевидні.
 *
 * **Рух показує те, чого не видно.** Плитка, яка щойно народилась або
 * склалась, **вистрибує** — без цього хід виглядав би як «дошка просто
 * перемалювалась», і людина не бачила б, що саме сталося (`changed` у хуку).
 *
 * @module web-platform-dev/src/pages/games/Game2048
 */

import {
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import { DIRECTIONS, type Direction, tileLevel } from "./twenty48";
import { use2048 } from "./use2048";

/** Знак на пульті — стрілка в той бік, куди їде дошка. */
const ARROW: Record<Direction, IconName> = {
  up: "arrow-up",
  down: "arrow-down",
  left: "arrow-left",
  right: "arrow-right",
};

const LABEL: Record<Direction, string> = {
  up: "Вгору",
  down: "Вниз",
  left: "Вліво",
  right: "Вправо",
};

/** Мінімальний зсув пальця, щоб це був свайп, а не дотик. */
const SWIPE_MIN = 24;

export function Game2048(): ReactElement {
  const { board, score, changed, over, reached, move, reset } = use2048();
  const [from, setFrom] = useState<{ x: number; y: number } | null>(null);

  // Стрілки клавіатури — для ноутбука. На телефоні хід робить свайп, і цей
  // слухач нічому не заважає: він мовчить, поки не натиснуто саме стрілку.
  useEffect(() => {
    const keys: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };
    const onKey = (event: KeyboardEvent): void => {
      const direction = keys[event.key];
      if (!direction) return;
      event.preventDefault();
      move(direction);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setFrom({ x: event.clientX, y: event.clientY });
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    setFrom(null);
    // Короткий дотик — це дотик, а не хід: інакше будь-який тап зсував би дошку
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  }

  // Що сказати словами, коли стан не очевидний сам: «ходів немає» і «2048 є»
  let text = "Зсувайте плитки — однакові складаються";
  let tone = "";
  if (over) {
    text = "Ходів немає — дошка повна";
    tone = " wb-game-result--lose";
  } else if (reached) {
    text = "2048 зібрано!";
    tone = " wb-game-result--win";
  }

  return (
    <div className="wb-game">
      <div className="wb-game-score-chips">
        <span className="wb-game-score-chip wb-game-score-chip--won">Очки: {score}</span>
      </div>

      <p className={`wb-game-result${tone}`}>
        {over || reached ? (
          <span className="wb-game-pop" key={text}>
            {text}
          </span>
        ) : (
          text
        )}
      </p>

      {/* Дошка ловить свайп цілком: палець ставить на плитку, а не на рамку */}
      <div
        className="wb-num-board"
        role="group"
        aria-label="Дошка 4 на 4"
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
      >
        {board.map((value, at) => {
          const marks =
            value !== null ? `wb-num-cell wb-num-cell--l${tileLevel(value)}` : "wb-num-cell";
          return (
            <div key={at} className={marks}>
              {value !== null && (
                // Ключ від значення — щоб плитка, яка **змінилась**, була новим
                // елементом і рух справді починався: клас на тому самому вузлі
                // анімацію не перезапускає (та сама причина, що в камені-ножицях).
                <span
                  key={changed.includes(at) ? `${at}-${value}` : String(at)}
                  className="wb-game-pop"
                >
                  {value}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="wb-num-pad">
        {DIRECTIONS.map((direction) => (
          <button
            key={direction}
            type="button"
            className="wb-num-key"
            aria-label={LABEL[direction]}
            onClick={() => move(direction)}
          >
            <Icon name={ARROW[direction]} size={22} />
          </button>
        ))}
      </div>

      <div className="wb-game-actions">
        <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={reset}>
          <Icon name="refresh" size={16} />
          {over ? "Ще партія" : "Спочатку"}
        </button>
      </div>
    </div>
  );
}
