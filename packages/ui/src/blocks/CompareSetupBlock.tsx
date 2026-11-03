/**
 * Page Builder — CompareSetupBlock: крок «кого або що аналізуємо».
 * Один крок на всі входи: питає ім'я та дату, а вид задає сторінка. Виняток —
 * порівняння людей із подіями: там вид стоїть у рядку, інакше таблиця не знала б,
 * як читати стовпець.
 *
 * @module packages/ui/src/blocks/CompareSetupBlock
 */

import { icons } from "@wwwuabot/shared";
import {
  DATE_ANALYSIS_RESULT_PATH,
  parseScope,
  type AnalysisScope,
} from "@wwwuabot/shared/content";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { formatDate } from "@wwwuabot/shared/utils/mydate-helpers";
import { isMixedScope, useSubjectSetup, type SubjectRow } from "./compare-setup/useSubjectSetup";

/** Підпис виду в рядку таблиці: те саме слово, що й у шапці результату. */
function kindLabel(kind: SubjectRow["kind"]): string {
  return kind === "event" ? "Подія" : "Людина";
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
  const subjectWord = scope === "event" ? "подію" : "людину";

  const setup = useSubjectSetup({
    scope,
    nextUrl,
    maxRows: mixed || !selfMode ? Math.max(1, maxDates) : 1,
    selfMode,
    initialName: context.user?.firstName ?? context.user?.username,
  });

  const lead =
    description ??
    (selfMode
      ? "Вкажіть свою дату народження — решта даних уже є в профілі."
      : mixed
        ? "Додайте людей і події в тому порядку, у якому хочете їх порівняти. Для кожного рядка вкажіть, хто це."
        : `Вкажіть ${subjectWord} для аналізу: ім'я та дату. Ім'я підпише стовпець у таблиці.`);

  /** Вид одного суб'єкта: у змішаному режимі — вибір, інакше — підпис. */
  const kindField = (row: SubjectRow, index: number) =>
    mixed ? (
      <select
        className="wb-input wb-block-compare-setup__kind"
        value={row.kind}
        aria-label="Що це"
        onChange={(event) =>
          setup.update(index, { kind: event.target.value === "event" ? "event" : "person" })
        }
      >
        <option value="person">Людина</option>
        <option value="event">Подія</option>
      </select>
    ) : (
      <span className="wb-text-sm wb-text-muted">{kindLabel(row.kind)}</span>
    );

  return (
    <div className="wb-block-compare-setup">
      <h2 className="wb-block-compare-setup__title">{title}</h2>
      <p className="wb-text-sm wb-text-muted wb-block-compare-setup__lead">{lead}</p>

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
          <span className="wb-label">Ім'я</span>
          <input
            type="text"
            className="wb-input"
            value={selfMode ? (setup.rows[0]?.name ?? "") : setup.draftName}
            placeholder={scope === "event" ? "Наприклад, весілля" : "Наприклад, Олена"}
            onChange={(event) =>
              selfMode
                ? setup.update(0, { name: event.target.value })
                : setup.setDraftName(event.target.value)
            }
          />
        </label>

        <label className="wb-block-compare-setup__field">
          <span className="wb-label">{scope === "event" ? "Дата події" : "Дата народження"}</span>
          <input
            type="date"
            className="wb-input"
            value={selfMode ? (setup.rows[0]?.date ?? "") : setup.draftDate}
            onChange={(event) =>
              selfMode
                ? setup.update(0, { date: event.target.value })
                : setup.setDraftDate(event.target.value)
            }
          />
        </label>

        {!selfMode && (
          <button className="wb-btn wb-btn-secondary" onClick={setup.add} disabled={!setup.canAdd}>
            {setup.addLabel}
          </button>
        )}
      </div>

      {!selfMode && setup.rows.length > 0 && (
        <div className="wb-block-compare-setup__list">
          {setup.rows.map((row, index) => (
            <div key={`${row.date}-${index}`} className="wb-block-compare-setup__item">
              <span className="wb-block-compare-setup__date">
                {row.name ? <strong>{row.name}</strong> : null}
                <span className={row.name ? "wb-text-sm wb-text-muted" : undefined}>
                  {formatDate(row.date)}
                </span>
              </span>

              {kindField(row, index)}

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

      <button
        className="wb-btn wb-btn-primary wb-block-compare-setup__action"
        onClick={setup.goNext}
        disabled={!setup.canGo}
      >
        {setup.canGo ? "Обрати системи аналізу" : "Вкажіть дату"}
      </button>
    </div>
  );
}
