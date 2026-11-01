/**
 * Page Builder — CompareSetupBlock: ручне введення дат для аналізу.
 *
 * Другий вхід у той самий функціонал (перший — чекбокси на екрані дат):
 * людина додає дати, міняє їхній порядок і йде на аналіз — стовпці таблиці
 * стоять у тому ж порядку. Вигляд — у `styles/blocks.css`.
 *
 * @module packages/ui/src/blocks/CompareSetupBlock
 */

import { useState, useCallback } from "react";
import { icons } from "@wwwuabot/shared";
import { DATE_ANALYSIS_RESULT_PATH } from "@wwwuabot/shared/content";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { formatDate } from "@wwwuabot/shared/utils/mydate-helpers";

export function CompareSetupBlock({ block }: BlockComponentProps) {
  const {
    title = "Аналіз дат",
    description = "Вкажіть дати для аналізу. Дати можна переміщати — це визначить порядок стовпців у таблиці.",
    maxDates = 10,
    nextUrl = DATE_ANALYSIS_RESULT_PATH,
  } = block.props as {
    title?: string;
    description?: string;
    maxDates?: number;
    nextUrl?: string;
  };

  const [input, setInput] = useState("");
  const [dates, setDates] = useState<string[]>([]);

  const addDate = useCallback(() => {
    if (!input) return;
    if (dates.includes(input)) return;
    if (dates.length >= maxDates) return;
    setDates((prev) => [...prev, input]);
    setInput("");
  }, [input, dates, maxDates]);

  const move = useCallback((index: number, dir: -1 | 1) => {
    setDates((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const remove = useCallback((index: number) => {
    setDates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const goNext = useCallback(() => {
    if (dates.length === 0) return;
    const url = `${nextUrl}?dates=${encodeURIComponent(dates.join(","))}`;
    window.location.href = url;
  }, [dates, nextUrl]);

  return (
    <div className="wb-block-compare-setup">
      <h2 className="wb-block-compare-setup__title">{title}</h2>
      <p className="wb-text-sm wb-text-muted wb-block-compare-setup__lead">{description}</p>

      <div className="wb-block-compare-setup__row">
        <input
          type="date"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="wb-input wb-block-compare-setup__input"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDate();
            }
          }}
        />
        <button
          className="wb-btn wb-btn-primary"
          onClick={addDate}
          disabled={!input || dates.length >= maxDates}
        >
          Додати дату
        </button>
      </div>

      {dates.length > 0 && (
        <div className="wb-block-compare-setup__list">
          {dates.map((d, i) => (
            <div key={`${d}-${i}`} className="wb-block-compare-setup__item">
              <span className="wb-block-compare-setup__date">{formatDate(d)}</span>
              <button
                type="button"
                className="wb-move-btn"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="Вгору"
              >
                {icons["chevron-up"]}
              </button>
              <button
                type="button"
                className="wb-move-btn"
                onClick={() => move(i, 1)}
                disabled={i === dates.length - 1}
                title="Вниз"
              >
                {icons["chevron-down"]}
              </button>
              <button
                type="button"
                className="wb-close-btn"
                onClick={() => remove(i)}
                title="Видалити"
              >
                {icons["close"]}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        className="wb-btn wb-btn-primary wb-block-compare-setup__action"
        onClick={goNext}
        disabled={dates.length === 0}
      >
        {dates.length === 0
          ? "Додайте хоча б одну дату"
          : `Обрати системи для аналізу (${dates.length})`}
      </button>
    </div>
  );
}
