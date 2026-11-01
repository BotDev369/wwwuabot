/**
 * Page Builder — картка дати.
 *
 * Дата береться з даних (своя або день народження людини), а знак, стихія й
 * число життєвого шляху рахуються з неї — це зміст, не оформлення. Три подання
 * (повна картка, компактна, рядок) — варіант; мірки й розмір знака —
 * `styles/blocks.css`.
 *
 * @module packages/ui/src/blocks/DateCardBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

const ZODIAC_SIGNS = [
  { name: "Козеріг", symbol: "♑", dates: "22.12 – 20.01", element: "Земля" },
  { name: "Водолій", symbol: "♒", dates: "21.01 – 19.02", element: "Повітря" },
  { name: "Риби", symbol: "♓", dates: "20.02 – 20.03", element: "Вода" },
  { name: "Овен", symbol: "♈", dates: "21.03 – 20.04", element: "Вогонь" },
  { name: "Телець", symbol: "♉", dates: "21.04 – 21.05", element: "Земля" },
  { name: "Близнюки", symbol: "♊", dates: "22.05 – 21.06", element: "Повітря" },
  { name: "Рак", symbol: "♋", dates: "22.06 – 22.07", element: "Вода" },
  { name: "Лев", symbol: "♌", dates: "23.07 – 22.08", element: "Вогонь" },
  { name: "Діва", symbol: "♍", dates: "23.08 – 22.09", element: "Земля" },
  { name: "Терези", symbol: "♎", dates: "23.09 – 23.10", element: "Повітря" },
  { name: "Скорпіон", symbol: "♏", dates: "24.10 – 21.11", element: "Вода" },
  { name: "Стрілець", symbol: "♐", dates: "22.11 – 21.12", element: "Вогонь" },
];

function getZodiacSign(month: number, day: number): (typeof ZODIAC_SIGNS)[0] {
  const cutoffs = [20, 19, 20, 20, 21, 21, 22, 22, 22, 23, 22, 21];
  // До межі знак попередній (січень — Козеріг), після — наступний; грудень
  // за межою завертає коло на Козеріга, а не за кінець списку.
  const idx = day > cutoffs[month - 1] ? month % 12 : month - 1;
  return ZODIAC_SIGNS[idx];
}

function reduceToSingleDigit(n: number): number {
  while (n >= 10) {
    n = String(n)
      .split("")
      .reduce((s, d) => s + Number(d), 0);
  }
  return n;
}

export function DateCardBlock({ block, context }: BlockComponentProps) {
  const {
    dateSource = "user-birthday",
    customDate = "",
    showZodiac = true,
    showElement = true,
    showNumerology = true,
    layout = "full",
  } = block.props as {
    dateSource?: string;
    customDate?: string;
    showZodiac?: boolean;
    showElement?: boolean;
    showNumerology?: boolean;
    layout?: string;
  };

  let date: Date | null = null;

  if (dateSource === "custom" && customDate) {
    date = new Date(customDate);
  } else if (context.user) {
    const birthday = context.user["birthday"] as string | undefined;
    if (birthday) {
      date = new Date(birthday);
    }
  }

  if (!date || isNaN(date.getTime())) {
    return (
      <div className="wb-block-date-card wb-empty">
        <span className="wb-text-sm wb-text-muted">Дату не вказано</span>
      </div>
    );
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const zodiac = getZodiacSign(month, day);
  const lifePath = reduceToSingleDigit(year + month + day);
  const variant = layout === "minimal" || layout === "compact" ? layout : "full";

  if (variant === "minimal") {
    return (
      <div className="wb-block-date-card wb-block-date-card--minimal">
        {showZodiac && <span className="wb-block-date-card__symbol">{zodiac.symbol}</span>}
        <div>
          {showZodiac && <div className="wb-block-date-card__name">{zodiac.name}</div>}
          {showZodiac && <div className="wb-block-date-card__dates">{zodiac.dates}</div>}
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="wb-block-date-card wb-block-date-card--compact">
        <div className="wb-block-date-card__symbol">{zodiac.symbol}</div>
        <div className="wb-block-date-card__name">{zodiac.name}</div>
        <div className="wb-block-date-card__date">{date.toLocaleDateString("uk-UA")}</div>
      </div>
    );
  }

  return (
    <div className="wb-block-date-card wb-block-date-card--full">
      {showZodiac && <div className="wb-block-date-card__symbol">{zodiac.symbol}</div>}

      {showZodiac && <div className="wb-block-date-card__name">{zodiac.name}</div>}

      {showZodiac && <div className="wb-block-date-card__dates">{zodiac.dates}</div>}

      <div className="wb-block-date-card__date">
        {date.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
      </div>

      <div className="wb-block-date-card__meta">
        {showElement && (
          <div className="wb-block-date-card__meta-item">
            <div className="wb-block-date-card__meta-label">Стихія</div>
            <div className="wb-block-date-card__meta-value">{zodiac.element}</div>
          </div>
        )}
        {showNumerology && (
          <div className="wb-block-date-card__meta-item">
            <div className="wb-block-date-card__meta-label">Число</div>
            <div className="wb-block-date-card__meta-value">{lifePath}</div>
          </div>
        )}
      </div>
    </div>
  );
}
