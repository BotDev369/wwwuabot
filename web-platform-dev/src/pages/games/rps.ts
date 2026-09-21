/**
 * Камінь, ножиці, папір — правила одного раунду.
 *
 * **Переможець — таблиця, а не ланцюг `if`.** Дев'ять пар — це дев'ять
 * рядків даних: у гілках вони розповзаються, і «ножиці б'ють папір» тихо
 * перестає бути правдою після другої ж правки.
 *
 * **Бот випадковий навмисно.** Тут немає чого «грати добре»: гра
 * симетрична, і будь-яка стратегія бота або слабша за випадок, або
 * нечесна — людина бачить закономірність і перестає вірити рахунку.
 *
 * @module web-platform-dev/src/pages/games/rps
 */

export type RpsChoice = "rock" | "scissors" | "paper";
export type RpsOutcome = "win" | "lose" | "draw";

/** Порядок — як у грі на пальцях: камінь, ножиці, папір. */
export const RPS_CHOICES: readonly { key: RpsChoice; label: string }[] = [
  { key: "rock", label: "Камінь" },
  { key: "scissors", label: "Ножиці" },
  { key: "paper", label: "Папір" },
];

/** Скільки перемог закривають партію. */
export const RPS_TARGET = 3;

/** Кого б'є кожен вибір. */
const BEATS: Record<RpsChoice, RpsChoice> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

export function outcome(player: RpsChoice, bot: RpsChoice): RpsOutcome {
  if (player === bot) return "draw";
  return BEATS[player] === bot ? "win" : "lose";
}

/** Вибір бота. `random` — аргумент, щоб тест міг грати передбачувано. */
export function randomChoice(random: () => number = Math.random): RpsChoice {
  const index = Math.floor(random() * RPS_CHOICES.length);
  return RPS_CHOICES[index]?.key ?? "rock";
}

/** Назва вибору для рядка стану («Камінь», а не `rock`). */
export function choiceLabel(choice: RpsChoice): string {
  return RPS_CHOICES.find((entry) => entry.key === choice)?.label ?? "";
}
