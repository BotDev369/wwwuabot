/**
 * Page Builder — DateAnalysisBlock: екран досьє. Суб'єктів може бути кілька —
 * кожен має своє досьє; дати й підписи їдуть `?dates=` / `?labels=`, вид —
 * `?kind=`, вибрані системи — `?lenses=`. Без вибору систем досьє не рахується:
 * людина сама каже, які лінзи читають дату.
 *
 * @module packages/ui/src/blocks/DateAnalysisBlock
 */

import { useMemo, useState } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { DATE_ANALYSIS_PATH } from "@wwwuabot/shared/content";
import { analysisScreenTitle } from "./date-analysis/screen-title";
import { readDates, readLenses, readSubject } from "./date-analysis/date-params";
import { useDossiers } from "./date-analysis/useDossiers";
import { Dossier, humanDate } from "./date-analysis/Dossier";
import { DossierLensPicker } from "./date-analysis/DossierLensPicker";
import { DossierSurvey } from "./date-analysis/DossierSurvey";

export function DateAnalysisBlock({ block }: BlockComponentProps) {
  const { title: storedTitle, backUrl = DATE_ANALYSIS_PATH } = block.props as {
    title?: string;
    backUrl?: string;
  };

  // Адреса читається один раз за прохід екрана: крок змінюється переходом на
  // іншу адресу, а не станом цього компонента. Вибір систем — виняток: він
  // живе в адресі, щоб перезавантаження не втратило вибір.
  const search = window.location.search;
  const dates = useMemo(() => readDates(search), [search]);
  const subject = useMemo(() => readSubject(search, dates.length), [search, dates.length]);
  const initialLenses = useMemo(() => readLenses(search), [search]);
  const [lenses, setLenses] = useState<readonly string[]>(initialLenses);
  const [pickerOpen, setPickerOpen] = useState(initialLenses.length === 0);
  const { dossiers, loading, error } = useDossiers(dates, subject.kinds, lenses);

  function applyLenses(next: string[]): void {
    setLenses(next);
    setPickerOpen(false);
    const params = new URLSearchParams(window.location.search);
    if (next.length > 0) params.set("lenses", next.join(","));
    else params.delete("lenses");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  if (dates.length === 0) {
    return (
      <div className="wb-block-date-analysis">
        <p className="wb-text-muted">Немає суб'єктів для аналізу.</p>
        <a className="wb-btn wb-btn-secondary" href={backUrl}>
          Обрати, кого аналізувати
        </a>
      </div>
    );
  }

  const heading =
    subject.self && subject.scope === "person"
      ? "Ваше досьє:"
      : analysisScreenTitle("analysis", storedTitle);

  return (
    <div className="wb-block-date-analysis">
      <h2 className="wb-block-date-analysis__title">{heading}</h2>
      <p className="wb-text-sm wb-text-muted wb-block-date-analysis__lead">
        Домени якостей, свідчення джерел і чесні порожнечі. Дата дає символічний шар; опитування
        додає другий вектор окремо.
      </p>

      <DossierLensPicker
        selected={lenses}
        open={pickerOpen}
        onToggle={() => setPickerOpen((value) => !value)}
        onApply={applyLenses}
      />

      {lenses.length > 0 && <DossierSurvey />}

      {loading && <p className="wb-text-sm wb-text-muted">Аналізуємо...</p>}
      {error && <p className="wb-text-sm wb-block-date-analysis__error">{error}</p>}

      {!loading && !error && lenses.length > 0 && (
        <div className="wb-dossiers">
          {dossiers.map((dossier, index) => (
            <Dossier
              key={dossier.date}
              dossier={dossier}
              name={
                subject.labels[index] ||
                (subject.self && subject.scope === "person"
                  ? "Ви"
                  : dossier.kind === "event"
                    ? "Подія"
                    : humanDate(dossier.date))
              }
            />
          ))}

          {dossiers.length === 0 && (
            <p className="wb-text-sm wb-text-muted">Не вдалося скласти досьє для цих дат.</p>
          )}
        </div>
      )}

      <p className="wb-text-sm wb-text-muted wb-block-date-analysis__foot">
        Досьє не ставить діагнозів і не дає відсотків: рівень тут — мова поведінкових якорів, а не
        бал.
      </p>
    </div>
  );
}
