/**
 * Крок систем: чотири традиції, усі вже вибрані — вибір звужує погляд, а не
 * слугує перепусткою до результату.
 *
 * @module web-platform-dev/src/pages/analysis/SystemsStep
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { LENSES } from "@wwwuabot/shared/qualities";
import { readDates, readLenses, readSubject } from "@wwwuabot/ui/analysis/params";
import { useAnalysisChrome } from "./analysis-chrome";
import { ANALYSIS_PATH, analysisStepPath, type AnalysisMode } from "@/app/routes";

interface SystemsStepProps {
  mode: AnalysisMode;
}

const ALL = LENSES.map((lens) => lens.id);

export function SystemsStep({ mode }: SystemsStepProps): ReactElement {
  useAnalysisChrome("Хто читає дату?");
  const navigate = useNavigate();
  const search = window.location.search;
  const dates = readDates(search);
  const subject = readSubject(search, dates.length);
  const preselected = readLenses(search);
  const [chosen, setChosen] = useState<readonly string[]>(
    preselected.length > 0 ? preselected : ALL,
  );

  function toggle(id: string): void {
    setChosen((current) =>
      current.includes(id) ? current.filter((one) => one !== id) : [...current, id],
    );
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (chosen.length === 0 || dates.length === 0) return;
    const params = new URLSearchParams(search);
    params.set("lenses", chosen.join(","));
    navigate(`${analysisStepPath(mode, "result")}?${params.toString()}`);
  }

  return (
    <div className="wb-page wb-page-scroll">
      <form className="an-setup" onSubmit={submit}>
        <header className="an-setup__head">
          <h1 className="an-setup__title">Хто читає дату?</h1>
          <p className="an-setup__lead">
            {dates.length === 1
              ? "Чотири традиції незалежно одна від одної."
              : `${dates.length} дати — кожна система читає кожну.`}
          </p>
          {subject.labels.filter(Boolean).length > 0 && (
            <p className="an-setup__names">{subject.labels.filter(Boolean).join(" · ")}</p>
          )}
        </header>

        <div className="an-systems">
          {LENSES.map((lens) => {
            const on = chosen.includes(lens.id);
            return (
              <label key={lens.id} className={`an-system${on ? " an-system--on" : ""}`}>
                <input
                  className="an-system__check"
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(lens.id)}
                />
                <span className="an-system__body">
                  <span className="an-system__name">{lens.name}</span>
                  <span className="an-system__rule">{lens.rule}</span>
                </span>
                <Icon name={on ? "check" : "plus"} size={18} />
              </label>
            );
          })}
        </div>

        <button
          type="submit"
          className="wb-btn wb-btn-primary an-submit"
          disabled={chosen.length === 0 || dates.length === 0}
        >
          Порахувати профіль
        </button>

        <a className="an-back" href={ANALYSIS_PATH}>
          <Icon name="arrow-left" size={16} />
          До розділів
        </a>
      </form>
    </div>
  );
}
