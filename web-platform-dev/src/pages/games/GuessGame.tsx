/**
 * `GuessGame` — «вгадай число»: поле, підказка й історія спроб.
 *
 * **Історія — не прикраса.** У цій грі памʼять і є гра: без списку спроб
 * людина тримає попередні відповіді в голові й рахує їх заново, а «менше /
 * більше» без історії читається як випадкові слова.
 *
 * **Порожній ввід не карається.** Промах пальцем по «Спробувати» з порожнім
 * полем не додає спроби — на це вказує підказка під полем, і вона ж показує
 * межі діапазону, які бере з правил (`GUESS_MIN` / `GUESS_MAX`), а не з
 * літералів у розмітці.
 *
 * @module web-platform-dev/src/pages/games/GuessGame
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { GUESS_MAX, GUESS_MIN, type GuessVerdict } from "./guess";
import { useGuess } from "./useGuess";

/** Що казати після спроби — по-людськи й без підказки «спробуй іще». */
const VERDICT_TEXT: Record<GuessVerdict, string> = {
  lower: "менше",
  higher: "більше",
  hit: "це воно",
};

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

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    // Число лишаємо в полі, якщо його не прийняли: стерти написане за людину
    // означало б змусити набирати те саме вдруге.
    if (game.submit(value)) setValue("");
  }

  return (
    <div className="wb-game">
      <p className="wb-game-status">
        {game.solved
          ? `Вгадали за ${game.attempts.length} ${attemptsWord(game.attempts.length)}`
          : "Я загадав число — спробуйте вгадати"}
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
              className={`wb-game-attempt${attempt.verdict === "hit" ? " wb-game-attempt--hit" : ""}`}
            >
              {attempt.value} · {VERDICT_TEXT[attempt.verdict]}
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
