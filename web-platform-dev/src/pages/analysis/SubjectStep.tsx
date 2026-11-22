/**
 * Крок даних: **одна форма** — вибрати зі збережених або додати нову. Нею
 * користуються і людина, і подія; співставлення відрізняється лише кількістю
 * рядків. Збережене можна змінити й видалити тут же, не йдучи в інший розділ.
 *
 * @module web-platform-dev/src/pages/analysis/SubjectStep
 */

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { deleteMyDate, fetchMyDates, saveMyDate } from "@wwwuabot/ui/analysis/api";
import { readDates, readSubject } from "@wwwuabot/ui/analysis/params";
import { useAnalysisChrome } from "./analysis-chrome";
import { ANALYSIS_PATH, analysisStepPath, type AnalysisMode } from "@/app/routes";
import { EntityRow, RowAction } from "./EntityRow";

interface SubjectStepProps {
  mode: AnalysisMode;
}

interface Row {
  date: string;
  name: string;
}

const COPY: Record<AnalysisMode, { title: string; lead: string; submit: string }> = {
  person: {
    title: "Аналізувати за датою",
    lead: "Виберіть зі збережених або додайте нову дату. Ім'я — лише підпис.",
    submit: "Далі",
  },
  event: {
    title: "Аналізувати за датою",
    lead: "Виберіть зі збережених або додайте дату події.",
    submit: "Далі",
  },
  compare: {
    title: "Співставити",
    lead: "Дві людини, дві події або людина й подія. Виберіть зі збережених або додайте.",
    submit: "Далі",
  },
};

const MAX_ROWS = 4;

/** Людська дата: `1980-03-03` → `3.03.1980`. */
function humanDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${month}.${year}`;
}

/** Вид запису в `my_dates`: людина й подія — різні речі, а не один «other». */
function kindOf(mode: AnalysisMode): string {
  return mode === "event" ? "event" : "person";
}

/**
 * Співставлення починається не з нуля, коли людину вже обрано: профіль веде
 * сюди зі своєю датою, тож перший рядок заповнений, а другий чекає на другу
 * людину.
 */
function compareRows(search: string): Row[] {
  const dates = readDates(search);
  const labels = readSubject(search, dates.length).labels;
  const rows = dates.slice(0, MAX_ROWS).map((date, index) => ({ date, name: labels[index] ?? "" }));
  while (rows.length < 2) rows.push({ date: "", name: "" });
  return rows;
}

export function SubjectStep({ mode }: SubjectStepProps): ReactElement {
  const copy = COPY[mode];
  useAnalysisChrome(copy.title);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>(() =>
    mode === "compare" ? compareRows(window.location.search) : [{ date: "", name: "" }],
  );
  const [saved, setSaved] = useState<MyDate[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Row>({ date: "", name: "" });
  const [error, setError] = useState("");

  const kind = kindOf(mode);

  function loadSaved(): void {
    fetchMyDates()
      .then(setSaved)
      .catch(() => setSaved([]));
  }

  useEffect(() => {
    loadSaved();
  }, []);

  const filled = useMemo(() => rows.filter((row) => isValidDate(row.date)), [rows]);

  function update(index: number, patch: Partial<Row>): void {
    setRows((current) => current.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  }

  /** Вибір зі збереженого: дата стає рядком, а не копією запису. */
  function toggleSaved(one: MyDate): void {
    const at = rows.findIndex((row) => row.date === one.date && row.name === one.name);
    if (at >= 0) {
      setRows((current) => current.filter((_, index) => index !== at));
      return;
    }
    setRows((current) => {
      const empty = current.findIndex((row) => !row.date && !row.name);
      const next = { date: one.date, name: one.name };
      if (empty >= 0) return current.map((row, index) => (index === empty ? next : row));
      return current.length >= MAX_ROWS ? current : [...current, next];
    });
  }

  function chooseSaved(one: MyDate): boolean {
    return rows.some((row) => row.date === one.date && row.name === one.name);
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (filled.length === 0) return;

    // Нові рядки стають записами: інакше наступного разу людини знову немає, і
    // «вибрати зі збережених» нема з чого. Запис не тримає аналіз у заручниках:
    // не збереглося — людина однаково бачить розрахунок і може спробувати ще.
    for (const row of filled) {
      const known = saved.some((one) => one.date === row.date && one.name === row.name);
      if (!known) {
        saveMyDate({ date: row.date, name: row.name, type: kind }).catch((failure: Error) =>
          setError(failure.message),
        );
      }
    }

    const params = new URLSearchParams();
    params.set("dates", filled.map((row) => row.date).join(","));
    params.set("labels", filled.map((row) => row.name.trim()).join("|"));
    const quality = new URLSearchParams(window.location.search).get("quality");
    if (quality) params.set("quality", quality);
    navigate(`${analysisStepPath(mode, "systems")}?${params.toString()}`);
  }

  function startEdit(one: MyDate): void {
    setEditing(one.id);
    setDraft({ date: one.date, name: one.name });
  }

  function saveEdit(id: string): void {
    if (!isValidDate(draft.date)) return;
    setError("");
    saveMyDate({ id, date: draft.date, name: draft.name, type: kind })
      .then(() => {
        setEditing(null);
        loadSaved();
      })
      .catch((failure: Error) => setError(failure.message));
  }

  function remove(id: string): void {
    setError("");
    deleteMyDate(id)
      .then(loadSaved)
      .catch((failure: Error) => setError(failure.message));
  }

  return (
    <div className="wb-page wb-page-scroll">
      <form className="an-setup" onSubmit={submit}>
        <a className="an-back" href={ANALYSIS_PATH}>
          <Icon name="arrow-left" size={16} />
          До розділів
        </a>

        <header className="an-setup__head">
          <h1 className="an-setup__title" data-screen-title>
            {copy.title}
          </h1>
          <p className="an-setup__lead">{copy.lead}</p>
        </header>

        {error && <p className="an-empty">{error}</p>}

        {saved.length > 0 && (
          <section className="an-section">
            <h2 className="an-section__title">Зі збережених</h2>
            <div className="an-people">
              {saved.map((one) => {
                const label = one.name || humanDate(one.date);
                return (
                  <EntityRow
                    key={one.id}
                    name={one.name || "Без підпису"}
                    meta={humanDate(one.date)}
                    picked={chooseSaved(one)}
                    checkLabel={`Обрати ${label}`}
                    onToggle={() => toggleSaved(one)}
                    actions={
                      <>
                        <RowAction
                          label={`Змінити ${label}`}
                          icon="edit"
                          onClick={() => startEdit(one)}
                        />
                        <RowAction
                          label={`Видалити ${label}`}
                          icon="trash"
                          onClick={() => remove(one.id)}
                          danger
                        />
                      </>
                    }
                  >
                    {editing === one.id && (
                      <div className="an-pick">
                        <label className="an-field">
                          <span className="an-field__label">Дата</span>
                          <input
                            className="an-date"
                            type="date"
                            value={draft.date}
                            max="2100-12-31"
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, date: event.target.value }))
                            }
                          />
                        </label>
                        <label className="an-field">
                          <span className="an-field__label">Підпис</span>
                          <input
                            className="an-input"
                            type="text"
                            value={draft.name}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, name: event.target.value }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="wb-btn wb-btn-primary"
                          onClick={() => saveEdit(one.id)}
                        >
                          Зберегти зміни
                        </button>
                      </div>
                    )}
                  </EntityRow>
                );
              })}
            </div>
          </section>
        )}

        <section className="an-section">
          <h2 className="an-section__title">Або додати нову</h2>

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
                  <span className="an-field__label">Підпис</span>
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
              className="an-tool"
              onClick={() => setRows((current) => [...current, { date: "", name: "" }])}
            >
              <Icon name="plus" size={16} />
              Ще один
            </button>
          )}
        </section>

        <button className="wb-btn wb-btn-primary" type="submit" disabled={filled.length === 0}>
          {copy.submit}
        </button>
      </form>
    </div>
  );
}
