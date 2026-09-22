/**
 * `NupogodiFigures` — курка, вовк із кошиком і подвір'я, намальовані фігурами,
 * а не зібрані з рамок.
 *
 * **Чому фігура, а не `Icon`.** Знак у реєстрі іконок — один контур одного
 * кольору. Курці ж потрібні гребінь, дзьоб, хвіст і ноги різних кольорів, а
 * вовкові — ще й кошик із яйцями: кілька кольорів в одному знаку роблять із
 * нього картину, і місце їй у грі, а не в реєстрі застосунку.
 *
 * **Подвір'я теж намальовано.** Кущі й травинки колись були градієнтами в
 * CSS, і у скріні виходила рівна луска на смузі: коло з `background-size`
 * повторюється без кінця, тож травинки виходили однакової висоти й ширини.
 * Малюнок не має цієї межі — а виглядає тут усе одно що густіше, що порожніше.
 *
 * **Кольору в розмітці немає.** Кожна частина носить клас (`wb-hen-comb`), а
 * колір приходить із `games.css` — так само, як у решти ігор: палітра гри
 * живе одним блоком у CSS, і тест стереже, щоб у розмітці не зʼявилось жодного
 * `#` чи `rgba(`.
 *
 * **Геометрія кошика — не довільна.** Вінця кошика стоять на `y = 80` із 104:
 * це та сама лінія, на якій низ доріжок, тобто місце, куди приїжджає яйце.
 * Екран зсуває фігуру на ці 24 одиниці вниз (`margin-bottom`), тому збіг
 * тримається на одному числі, а не на окомірі.
 *
 * @module web-platform-dev/src/pages/games/NupogodiFigures
 */

import type { ReactElement } from "react";

/**
 * Курка на сідалі: дивиться праворуч, ноги стоять на самому низу фігури —
 * саме тому вона «стоїть» на жердці, а не висить над нею.
 */
export function HenFigure(): ReactElement {
  return (
    <svg viewBox="0 0 64 64" className="wb-hen" aria-hidden="true" focusable="false">
      {/* Хвіст — позаду тіла: три пера одним віялом */}
      <path className="wb-hen-tail" d="M22 34C12 30 6 22 6 12c8 6 14 12 18 18Z" />
      <path className="wb-hen-tail" d="M22 38C10 38 2 32 0 22c8 4 16 8 23 12Z" />
      <path className="wb-hen-tail" d="M24 42c-10 2-18 0-22-6 8 2 16 2 22 2Z" />
      <path
        className="wb-hen-body"
        d="M16 27c0-9 10-14 21-12 10 2 15 9 14 17-1 9-13 14-24 12-8-2-11-9-11-17Z"
      />
      <path className="wb-hen-wing" d="M24 26c6-4 16-2 19 4 2 6-5 11-12 9-5-2-8-8-7-13Z" />
      <path className="wb-hen-head" d="M38 18a10 10 0 1 1 20 0 10 10 0 0 1-20 0Z" />
      <path className="wb-hen-comb" d="M42 9c-2-7 2-9 4-3 1-6 5-6 6 0 2-5 6-4 5 3Z" />
      <path className="wb-hen-wattle" d="M46 27c0 5-2 8-4 6-2-2 0-5 4-6Z" />
      <path className="wb-hen-beak" d="M56 18l7 3-7 3Z" />
      <circle className="wb-hen-eye" cx="50" cy="15" r="1.7" />
      <path className="wb-hen-legs" d="M30 44v15m0 0l-5 5m5-5l5 5M41 45v14m0 0l-5 5m5-5l5 5" />
    </svg>
  );
}

/**
 * Вовк із кошиком: обличчям праворуч, кошик тримає перед собою на висоті
 * вінця — на тій лінії, на якій ловлять.
 */
export function WolfFigure(): ReactElement {
  return (
    <svg viewBox="0 0 96 104" className="wb-wolf" aria-hidden="true" focusable="false">
      {/* Хвіст — позаду всього: його читають силуетом, а не деталлю */}
      <path className="wb-wolf-tail" d="M30 70C14 74 2 62 2 44c8 8 18 12 28 12Z" />
      <path className="wb-wolf-tail-tip" d="M2 44c4 4 8 6 13 7-3 5-8 6-13 3Z" />
      {/* Ноги — поза кошиком: вовк **біжить**, а не стоїть. Крок розведено:
          задня нога назад, передня вперед — саме він і робить із фігури рух */}
      <path className="wb-wolf-leg" d="M32 80c-4 8-8 12-16 14l14 4" />
      <path className="wb-wolf-leg" d="M64 80c4 8 8 12 14 13l-12 5" />
      <path className="wb-wolf-body" d="M32 34c-12 8-14 32-6 52h44c8-20 6-44-6-52Z" />
      <path className="wb-wolf-belly" d="M41 54c-2 14 0 26 5 32h5c5-6 7-18 5-32Z" />
      <path className="wb-wolf-arm" d="M33 44c-4 10-6 22-6 34M63 44c4 10 6 22 6 34" />
      {/* Голова: два гострі вуха, довга морда, брова й око */}
      <path className="wb-wolf-ear" d="M36 6l10 20-16-2Z" />
      <path className="wb-wolf-ear" d="M62 4l10 20-18-2Z" />
      <path className="wb-wolf-head" d="M34 14c6-8 24-8 30 2 4 8-2 16-12 18h-8c-8-4-14-12-10-20Z" />
      <path className="wb-wolf-muzzle" d="M60 22c8 0 16 3 20 6-4 4-12 6-20 5Z" />
      <path className="wb-wolf-brow" d="M52 13l10 3" />
      <circle className="wb-wolf-eye" cx="58" cy="20" r="2.6" />
      <circle className="wb-wolf-nose" cx="79" cy="28" r="3" />
      {/* Кошик: вінця — та сама лінія, на якій ловлять яйце */}
      <g className="wb-nupogodi-basket">
        <ellipse className="wb-basket-egg" cx="42" cy="74" rx="5.5" ry="6.5" />
        <ellipse className="wb-basket-egg" cx="54" cy="74" rx="5.5" ry="6.5" />
        <path className="wb-basket-body" d="M30 84h36l-5 20H35Z" />
        <path className="wb-basket-weave" d="M31 92h34M33 100h30" />
        <path className="wb-basket-rim" d="M26 76h44v8H26Z" />
        <ellipse className="wb-wolf-paw" cx="32" cy="80" rx="6" ry="5" />
        <ellipse className="wb-wolf-paw" cx="64" cy="80" rx="6" ry="5" />
      </g>
    </svg>
  );
}

/**
 * Травинки стоять **рівним кроком**: випадковість тут нічого не додає, а
 * малюнок, який неможливо повторити, неможливо й перевірити.
 */
const TUFTS: readonly number[] = Array.from({ length: 34 }, (_, at) => 10 + at * 29);

/** Кущ: тіло знизу рівне — він «росте» з трави, а не висить над нею. */
function Bush({ at }: { at: number }): ReactElement {
  return (
    <path
      className="wb-yard-bush"
      vectorEffect="non-scaling-stroke"
      d={`M${at} 96c2-24 15-38 34-38s32 14 34 38Z`}
    />
  );
}

/**
 * Подвір'я: кущі по краях і травинки вздовж усього низу.
 *
 * Малюнок розтягнуто на всю ширину (`preserveAspectRatio="none"`), тому товщину
 * лінії тримає `vector-effect="non-scaling-stroke"`: без нього травинка на
 * широкому екрані ставала б удвічі товщою за кущ.
 */
export function YardStrip(): ReactElement {
  return (
    <svg
      viewBox="0 0 1000 96"
      className="wb-yard"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      <Bush at={-6} />
      <Bush at={920} />
      {TUFTS.map((at) => (
        <path
          key={at}
          className="wb-yard-tuft"
          vectorEffect="non-scaling-stroke"
          d={`M${at} 96l-4-14m4 14l1-18m-1 18l5-12`}
        />
      ))}
    </svg>
  );
}
