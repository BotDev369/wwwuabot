/**
 * `GuessGame` — «вгадай число»: смуга діапазону, рядок відповіді, історія.
 *
 * **Смуга — головне тут.** Замість того щоб людина тримала в голові «більше
 * 40, менше 70», екран малює **те, що ще може бути загаданим**: акцентна
 * ділянка звужується після кожної спроби (`boundsOf`), а риска показує, де
 * стоїть останній хід. Це та сама гра, лише видно, а не прочитано.
 *
 * **Відповідь — знак і слово.** «Менше» зі стрілкою вниз, «більше» — угору,
 * «це воно» — галочка: напрямок читається без читання.
 *
 * **Невдалий ввід не карається.** Промах пальцем по «Спробувати» з порожнім
 * полем не додає спроби — про це каже підказка в полі, і вона ж показує межі,
 * які беруться з правил (`GUESS_MIN` / `GUESS_MAX`), а не з літералів.
 *
 * @module web-platform-dev/src/pages/games/GuessGame
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import { GUESS_MAX, GUESS_MIN, type GuessVerdict } from "./guess";
import { useGuess } from "./useGuess";

/** Відповідь — знаком і словом: напрямок видно раніше, ніж прочитано. */
const VERDICT: Record<GuessVerdict, { text: string; icon: IconName; tone: string }> = {
  lower: { text: "менше", icon: "arrow-down", tone: "" },
  higher: { text: "більше", icon: "arrow-up", tone: "" },
  hit: { text: "це воно", icon: "check", tone: " wb-game-result--win" },
};

/** Скільки точок на смузі від початку до кінця діапазону. */
const TOTAL = GUESS_MAX - GUESS_MIN + 1;

/** Частка смуги у відсотках — від межі до межі. */
function percent(value: number): number {
  return ((value - GUESS_MIN) / TOTAL) * 100;
}

/**
 * «1 спроба», «2 спроби», «5 спроб».
 *
 * Українське число вимагає трьох форм, і без цієї функції екран писав би
 * «Вгадали за 1 спроб» — дрібниця, але саме з дрібниць складається те, чи
 * читається продукт як зроблений.
 */
function attemptsWord(count: number): string {
  const hundred = count % 100;
  if (hundred >= 11 && hundred <= 14) return "спроб";
  const tail = count % 10;
  if (tail === 1) return "спробу";
  if (tail >= 2 && tail <= 4) return "спроби";
  return "спроб";
}

export function GuessGame(): ReactElement {
  const game = useGuess();
  const [value, setValue] = useState("");
  const { low, high } = game.range;
  const last = game.last;

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    // Число лишаємо в полі, якщо його не прийняли: стерти написане за людину
    // означало б змусити набирати те саме вдруге.
    if (game.submit(value)) setValue("");
  }

  return (
    <div className="wb-game">
      {/* Що лишилось — числом під смугою: смуга показує **де**, а межі треба
          знати точно, інакше наступна спроба буде навмання. */}
      <div>
        <div className="wb-game-range">
          <span
            className="wb-game-range-band"
            style={{ left: `${percent(low)}%`, width: `${percent(high + 1) - percent(low)}%` }}
          />
          {last && (
            <span
              className="wb-game-range-mark"
              style={{ left: `calc(${percent(last.value)}% - 1.5px)` }}
            />
          )}
        </div>
        <div className="wb-game-range-labels">
          <span>{game.solved ? GUESS_MIN : low}</span>
          <span>
            {game.solved
              ? `Вгадано за ${game.attempts.length} ${attemptsWord(game.attempts.length)}`
              : "можливі числа"}
          </span>
          <span>{game.solved ? GUESS_MAX : high}</span>
        </div>
      </div>

      <p className={`wb-game-result${last ? VERDICT[last.verdict].tone : ""}`}>
        {game.solved ? (
          <span className="wb-game-pop" key="hit">
            <Icon name="check" size={22} />
            Це воно!
          </span>
        ) : last ? (
          <span className="wb-game-pop" key={game.attempts.length}>
            <Icon name={VERDICT[last.verdict].icon} size={22} />
            Загадане {VERDICT[last.verdict].text}
          </span>
        ) : (
          "Я загадав число — спробуйте вгадати"
        )}
      </p>

      {!game.solved && (
        <form className="wb-game-guess" onSubmit={handleSubmit}>
          <input
            className="wb-input"
            type="number"
            inputMode="numeric"
            min={GUESS_MIN}
            max={GUESS_MAX}
            value={value}
            placeholder={`Від ${GUESS_MIN} до ${GUESS_MAX}`}
            aria-label={`Ваше число, від ${GUESS_MIN} до ${GUESS_MAX}`}
            onChange={(event) => setValue(event.target.value)}
          />
          <button type="submit" className="wb-btn wb-btn-primary wb-btn-sm">
            Спробувати
          </button>
        </form>
      )}

      {game.attempts.length > 0 && (
        <div className="wb-game-attempts">
          {game.attempts.map((attempt, index) => (
            <span
              // Список лише додається, тож індекс — стабільний ключ. Число тут
              // ключем бути не може: те саме число людина має право ввести
              // двічі, і тоді ключі збіглися б.
              key={index}
              className={`wb-game-attempt wb-game-pop${
                attempt.verdict === "hit" ? " wb-game-attempt--hit" : ""
              }`}
            >
              <Icon name={VERDICT[attempt.verdict].icon} size={14} />
              {attempt.value}
            </span>
          ))}
        </div>
      )}

      <div className="wb-game-actions">
        <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={game.reset}>
          <Icon name="refresh" size={16} />
          {game.solved ? "Ще число" : "Спочатку"}
        </button>
      </div>
    </div>
  );
}
