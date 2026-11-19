/**
 * Крок даних: одна дата (ім'я за бажанням). Співставлення відрізняється лише
 * кількістю рядків, тож окремого екрана з іншими правилами немає.
 *
 * @module web-platform-dev/src/pages/analysis/SubjectStep
 */

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { ANALYSIS_PATH, analysisStepPath, type AnalysisMode } from "@/app/routes";

interface SubjectStepProps {
  mode: AnalysisMode;
}

interface Row {
  date: string;
  name: string;
}

const COPY: Record<AnalysisMode, { title: string; lead: string; submit: string }> = {
  person: {
    title: "Кого аналізуємо?",
    lead: "Дата народження — і все. Час, місто й прізвище не потрібні.",
    submit: "Далі",
  },
  event: {
    title: "Яка подія?",
    lead: "Дата події. Далі оберете, які традиції її читають.",
    submit: "Далі",
  },
  compare: {
    title: "Кого співставляємо?",
    lead: "Дві людини або більше. Покажемо спільне й напругу між ними.",
    submit: "Далі",
  },
};

const MAX_ROWS = 4;

export function SubjectStep({ mode }: SubjectStepProps): ReactElement {
  const copy = COPY[mode];
  useScreenChrome({ title: copy.title });
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>(() =>
    mode === "compare"
      ? [
          { date: "", name: "" },
          { date: "", name: "" },
        ]
      : [{ date: "", name: "" }],
  );

  const filled = useMemo(() => rows.filter((row) => isValidDate(row.date)), [rows]);

  function update(index: number, patch: Partial<Row>): void {
    setRows((current) => current.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (filled.length === 0) return;
    const params = new URLSearchParams();
    params.set("dates", filled.map((row) => row.date).join(","));
    params.set("labels", filled.map((row) => row.name.trim()).join("|"));
    navigate(`${analysisStepPath(mode, "systems")}?${params.toString()}`);
  }

  return (
    <div className="wb-page wb-page-scroll">
      <form className="an-setup" onSubmit={submit}>
        <header className="an-setup__head">
          <h1 className="an-setup__title">{copy.title}</h1>
          <p className="an-setup__lead">{copy.lead}</p>
        </header>

        <div className="an-rows">
          {rows.map((row, index) => (
            <div className="an-row" key={index}>
              <label className="an-field">
                <span className="an-field__label">
                  {mode === "event" ? "Дата події" : "Дата народження"}
                </span>
                <input
                  className="an-date"
                  type="date"
                  value={row.date}
                  max="2100-12-31"
                  required={index === 0}
                  onChange={(event) => update(index, { date: event.target.value })}
                />
              </label>

              <label className="an-field">
                <span className="an-field__label">Ім'я</span>
                <input
                  className="an-input"
                  type="text"
                  value={row.name}
                  placeholder={mode === "event" ? "Наприклад, запуск" : "За бажанням"}
                  onChange={(event) => update(index, { name: event.target.value })}
                />
              </label>

              {mode === "compare" && rows.length > 2 && (
                <button
                  type="button"
                  className="an-row__remove"
                  aria-label="Прибрати рядок"
                  onClick={() => setRows((current) => current.filter((_, at) => at !== index))}
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {mode === "compare" && rows.length < MAX_ROWS && (
          <button
            type="button"
            className="an-add"
            onClick={() => setRows((current) => [...current, { date: "", name: "" }])}
          >
            <Icon name="plus" size={16} />
            Додати ще
          </button>
        )}

        <button
          type="submit"
          className="wb-btn wb-btn-primary an-submit"
          disabled={filled.length === 0}
        >
          {copy.submit}
        </button>

        <a className="an-back" href={ANALYSIS_PATH}>
          <Icon name="arrow-left" size={16} />
          До аналізу
        </a>
      </form>
    </div>
  );
}
