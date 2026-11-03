/**
 * Page Builder — CompareSetupBlock: крок «кого або що аналізуємо». Питає, хто це і
 * коли, і тягне збережені дати — власна дата зберігається разом із нотаткою.
 * Вид задає сторінка; виняток — порівняння людей із подіями.
 *
 * @module packages/ui/src/blocks/CompareSetupBlock
 */

import { useState } from "react";
import { icons } from "@wwwuabot/shared";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import {
  DATE_ANALYSIS_RESULT_PATH,
  parseScope,
  type AnalysisScope,
} from "@wwwuabot/shared/content";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { formatDate } from "@wwwuabot/shared/utils/mydate-helpers";
import { isMixedScope, useSubjectSetup, type SubjectRow } from "./compare-setup/useSubjectSetup";
import { useSavedDates } from "./compare-setup/useSavedDates";

/** Збережена дата, яку можна обрати: те, що показує список під формою. */
function savedKind(date: MyDate, scope: AnalysisScope): SubjectRow["kind"] {
  if (scope !== "mixed") return scope === "event" ? "event" : "person";
  return date.type === "event" ? "event" : "person";
}

export function CompareSetupBlock({ block, context }: BlockComponentProps) {
  const {
    title = "Аналіз людини",
    description,
    maxDates = 1,
    nextUrl = DATE_ANALYSIS_RESULT_PATH,
    kind: rawScope = "person",
    selfMode = false,
  } = block.props as {
    title?: string;
    description?: string;
    maxDates?: number;
    nextUrl?: string;
    kind?: string;
    selfMode?: boolean;
  };

  const scope: AnalysisScope = parseScope(rawScope);
  const mixed = isMixedScope(scope);
  const noun = scope === "event" ? "подію" : scope === "mixed" ? "субʼєкта" : "людину";

  const saved = useSavedDates();
  const [remember, setRemember] = useState(true);
  const [savedNow, setSavedNow] = useState(false);

  // Свою дату зберігають один раз — далі вона приходить звідси, а не з памʼяті
  // браузера: так вона є й на іншому пристрої.
  const own = selfMode
    ? (saved.dates.find((date) => date.type === "person" && date.date) ?? null)
    : null;

  const setup = useSubjectSetup({
    scope,
    nextUrl,
    maxRows: mixed || !selfMode ? Math.max(1, maxDates) : 1,
    selfMode,
    initialName: context.user?.firstName ?? context.user?.username,
    prefill: own ? { date: own.date, name: own.name, notes: own.notes } : null,
  });

  const row = setup.rows[0];
  const available = saved.dates.filter((date) =>
    mixed ? true : date.type === (scope === "event" ? "event" : "person"),
  );

  const lead =
    description ??
    (selfMode
      ? "Дата народження — і все: решта вже в профілі. Нотатка поруч знадобиться пізніше — час, місто, уточнення."
      : mixed
        ? "Оберіть зі збережених або додайте нове. Для кожного рядка вкажіть, людина це чи подія."
        : `Оберіть ${noun} зі збережених або додайте нову: імʼя підпише стовпець у таблиці.`);

  /** Зберегти поточну дату кроку в бібліотеку — разом із нотаткою. */
  async function saveOwn(): Promise<void> {
    if (!row || !row.date) return;
    const ok = await saved.remember({
      date: row.date,
      name: row.name,
      notes: setup.notes,
      type: "person",
    });
    setSavedNow(ok);
  }

  /** Додати набраного субʼєкта, а за бажанням — і запамʼятати його. */
  function addDraft(): void {
    const added = setup.add();
    if (!added || !remember) return;
    void saved.remember({
      date: added.date,
      name: added.name,
      notes: "",
      type: added.kind === "event" ? "event" : "person",
    });
  }

  function pickSaved(date: MyDate): void {
    setup.addSubject({ date: date.date, name: date.name, kind: savedKind(date, scope) });
  }

  const kindField = (item: SubjectRow, index: number) =>
    mixed ? (
      <select
        className="wb-input wb-block-compare-setup__kind"
        value={item.kind}
        aria-label="Що це"
        onChange={(event) =>
          setup.update(index, { kind: event.target.value === "event" ? "event" : "person" })
        }
      >
        <option value="person">Людина</option>
        <option value="event">Подія</option>
      </select>
    ) : null;

  return (
    <div className="wb-block-compare-setup">
      <h2 className="wb-block-compare-setup__title">{title}</h2>
      <p className="wb-text-sm wb-text-muted wb-block-compare-setup__lead">{lead}</p>

      {selfMode ? (
        <div className="wb-block-compare-setup__panel">
          <label className="wb-block-compare-setup__field">
            <span className="wb-label">Імʼя</span>
            <input
              type="text"
              className="wb-input"
              value={row?.name ?? ""}
              onChange={(event) => setup.update(0, { name: event.target.value })}
            />
          </label>

          <label className="wb-block-compare-setup__field">
            <span className="wb-label">Дата народження</span>
            <input
              type="date"
              className="wb-input"
              value={row?.date ?? ""}
              onChange={(event) => setup.update(0, { date: event.target.value })}
            />
          </label>

          <label className="wb-block-compare-setup__field wb-block-compare-setup__field--wide">
            <span className="wb-label">Нотатка до дати</span>
            <textarea
              className="wb-input"
              rows={2}
              value={setup.notes}
              placeholder="Час і місто народження, уточнення — те, що знадобиться для точніших розрахунків"
              onChange={(event) => {
                setup.setNotes(event.target.value);
                setSavedNow(false);
              }}
            />
          </label>
        </div>
      ) : (
        <>
          {(available.length > 0 || saved.loading) && (
            <section className="wb-subject-saved">
              <h3 className="wb-subject-saved__title">Зі збережених</h3>

              {saved.loading ? (
                <p className="wb-text-sm wb-text-muted">Завантажуємо…</p>
              ) : (
                <div className="wb-subject-saved__list">
                  {available.map((date) => {
                    const picked = setup.rows.some((item) => item.date === date.date);
                    return (
                      <button
                        key={date.id}
                        type="button"
                        className="wb-subject-chip"
                        disabled={picked}
                        title={picked ? "Уже в списку" : "Додати до аналізу"}
                        onClick={() => pickSaved(date)}
                      >
                        <span className="wb-subject-chip__name">
                          {date.name || formatDate(date.date)}
                        </span>
                        <span className="wb-subject-chip__date">{formatDate(date.date)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section className="wb-subject-new">
            <h3 className="wb-subject-saved__title">
              {scope === "event" ? "Нова подія" : mixed ? "Новий субʼєкт" : "Нова людина"}
            </h3>

            <div className="wb-block-compare-setup__row">
              {mixed && (
                <label className="wb-block-compare-setup__field">
                  <span className="wb-label">Хто це</span>
                  <select
                    className="wb-input"
                    value={setup.draftKind}
                    onChange={(event) =>
                      setup.setDraftKind(event.target.value === "event" ? "event" : "person")
                    }
                  >
                    <option value="person">Людина</option>
                    <option value="event">Подія</option>
                  </select>
                </label>
              )}

              <label className="wb-block-compare-setup__field">
                <span className="wb-label">Імʼя</span>
                <input
                  type="text"
                  className="wb-input"
                  value={setup.draftName}
                  placeholder={scope === "event" ? "Наприклад, весілля" : "Наприклад, Олена"}
                  onChange={(event) => setup.setDraftName(event.target.value)}
                />
              </label>

              <label className="wb-block-compare-setup__field">
                <span className="wb-label">
                  {scope === "event" ? "Дата події" : "Дата народження"}
                </span>
                <input
                  type="date"
                  className="wb-input"
                  value={setup.draftDate}
                  onChange={(event) => setup.setDraftDate(event.target.value)}
                />
              </label>

              <button
                className="wb-btn wb-btn-secondary"
                onClick={addDraft}
                disabled={!setup.canAdd}
              >
                Додати
              </button>
            </div>

            <label className="wb-block-compare-setup__remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Запамʼятати — наступного разу буде в списку</span>
            </label>
          </section>

          {setup.rows.length > 0 && (
            <div className="wb-block-compare-setup__list">
              {setup.rows.map((item, index) => (
                <div key={`${item.date}-${index}`} className="wb-block-compare-setup__item">
                  <span className="wb-block-compare-setup__date">
                    {item.name ? <strong>{item.name}</strong> : null}
                    <span className={item.name ? "wb-text-sm wb-text-muted" : undefined}>
                      {formatDate(item.date)}
                    </span>
                  </span>

                  {kindField(item, index)}

                  <button
                    type="button"
                    className="wb-move-btn"
                    onClick={() => setup.move(index, -1)}
                    disabled={index === 0}
                    title="Вгору"
                  >
                    {icons["chevron-up"]}
                  </button>
                  <button
                    type="button"
                    className="wb-move-btn"
                    onClick={() => setup.move(index, 1)}
                    disabled={index === setup.rows.length - 1}
                    title="Вниз"
                  >
                    {icons["chevron-down"]}
                  </button>
                  <button
                    type="button"
                    className="wb-close-btn"
                    onClick={() => setup.remove(index)}
                    title="Видалити"
                  >
                    {icons["close"]}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {saved.error && <p className="wb-text-sm wb-date-error">{saved.error}</p>}

      {selfMode ? (
        <div className="wb-block-compare-setup__actions">
          <button
            className="wb-btn wb-btn-secondary"
            onClick={() => void saveOwn()}
            disabled={!setup.canGo || saved.saving}
          >
            {savedNow ? "Збережено" : "Зберегти дату"}
          </button>
          <button className="wb-btn wb-btn-primary" onClick={setup.goNext} disabled={!setup.canGo}>
            Обрати системи аналізу
          </button>
        </div>
      ) : (
        <button
          className="wb-btn wb-btn-primary wb-block-compare-setup__action"
          onClick={setup.goNext}
          disabled={!setup.canGo}
        >
          {setup.canGo ? "Обрати системи аналізу" : "Вкажіть дату"}
        </button>
      )}
    </div>
  );
}
