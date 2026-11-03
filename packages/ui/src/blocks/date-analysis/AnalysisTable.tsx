/**
 * Таблиця аналізу: та сама матриця у двох виглядах — рядками параметри
 * (стовпці — дати) або рядками дати (стовпці — системи й параметри).
 *
 * @module packages/ui/src/blocks/date-analysis/AnalysisTable
 */

import { Fragment, type ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  scopeColumnTitle,
  scopeOf,
  type AnalysisScope,
  type SubjectKind,
} from "@wwwuabot/shared/content";
import { useExpansion, type UseExpansionReturn } from "@wwwuabot/ui/hooks";
import { formatDate } from "@wwwuabot/shared/utils/mydate-helpers";
import type { CompareDetails, CompareMatrix } from "./api";
import type { AnalysisRow } from "./useAnalysisTable";
import { usePinnedHead } from "./usePinnedHead";

/** Вигляд: рядками параметри чи дати. */
export type AnalysisView = "params" | "dates";

interface TableData {
  dates: string[];
  /** Вид кожного суб'єкта — у тому ж порядку, що й `dates`. */
  kinds: SubjectKind[];
  rows: AnalysisRow[];
  matrix: CompareMatrix;
  details: CompareDetails;
  names: Record<string, string>;
}

/** Рядок-перемикач: підпис ліворуч, каретка праворуч. */
function RowToggle({
  rowId,
  open,
  onToggle,
  label,
}: {
  rowId: string;
  open: boolean;
  onToggle: (id: string) => void;
  label: ReactNode;
}) {
  return (
    <button
      type="button"
      className={open ? "wb-param-toggle wb-param-toggle--open" : "wb-param-toggle"}
      aria-expanded={open}
      onClick={() => onToggle(rowId)}
    >
      <span>{label}</span>
      <span className="wb-param-toggle__caret">
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
      </span>
    </button>
  );
}

/**
 * Шапка вигляду «рядками параметри»: стовпець — суб'єкт.
 *
 * Коли в таблиці стоять і люди, і події, над іменем є слово виду: без нього
 * трактування події читалося б як характеристика людини.
 */
function ParamsHead({
  dates,
  names,
  kinds,
}: {
  dates: string[];
  names: Record<string, string>;
  kinds: SubjectKind[];
}) {
  const mixed = scopeOf(kinds) === "mixed";
  return (
    <thead>
      <tr>
        <th scope="col">Параметр</th>
        {dates.map((date, index) => (
          <th key={date} scope="col">
            {mixed ? (
              <span className="wb-param-date__kind">
                {scopeColumnTitle(kinds[index] ?? "person")}
              </span>
            ) : null}
            <span className="wb-param-date">{formatDate(date)}</span>
            {names[date] ? <span className="wb-param-date__name">{names[date]}</span> : null}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** Шапка вигляду «рядками суб'єкти»: стовпець — система й параметр. */
function DatesHead({ rows, scope }: { rows: AnalysisRow[]; scope: AnalysisScope }) {
  return (
    <thead>
      <tr>
        <th scope="col">{scopeColumnTitle(scope)}</th>
        {rows.map((row, index) => (
          <th key={`${row.systemId}:${row.key}`} scope="col">
            {index === 0 || rows[index - 1].systemId !== row.systemId ? (
              <span className="wb-param-date__name">{row.systemName}</span>
            ) : null}
            <span className="wb-param-date">{row.label}</span>
          </th>
        ))}
      </tr>
    </thead>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="wb-text-sm wb-text-muted wb-param-empty">
        Немає даних для відображення
      </td>
    </tr>
  );
}

function ParamsRows({
  dates,
  rows,
  matrix,
  details,
  isExpanded,
  toggleExpanded,
}: Omit<TableData, "kinds" | "names"> & UseExpansionReturn) {
  return (
    <tbody>
      {rows.map((row, index) => {
        const rowId = `${row.systemId}:${row.key}`;
        const open = isExpanded(rowId);
        const showSystem = index === 0 || rows[index - 1].systemId !== row.systemId;
        return (
          <Fragment key={rowId}>
            {showSystem && (
              <tr className="wb-param-group">
                {/* Назва системи — у першому стовпці: комірка на всю ширину
                    обрізалась на краю екрана. */}
                <td>{row.systemName}</td>
                {dates.map((date) => (
                  <td key={date} />
                ))}
              </tr>
            )}
            <tr>
              <td className="wb-param-cell--toggle">
                <RowToggle rowId={rowId} open={open} onToggle={toggleExpanded} label={row.label} />
              </td>
              {dates.map((date) => (
                <td key={date} className="wb-param-value">
                  {matrix[date]?.[row.systemId]?.[row.key] ?? "—"}
                </td>
              ))}
            </tr>
            {open && (
              <tr className="wb-param-detail">
                <td>{row.about ?? "—"}</td>
                {dates.map((date) => (
                  <td key={date}>{details[date]?.[row.systemId]?.[row.key]?.meaning ?? "—"}</td>
                ))}
              </tr>
            )}
          </Fragment>
        );
      })}
      {rows.length === 0 && <EmptyRow colSpan={dates.length + 1} />}
    </tbody>
  );
}

function DatesRows({
  dates,
  rows,
  matrix,
  details,
  names,
  kinds,
  isExpanded,
  toggleExpanded,
}: TableData & UseExpansionReturn) {
  return (
    <tbody>
      {dates.map((date) => {
        const rowId = `date:${date}`;
        const open = isExpanded(rowId);
        return (
          <Fragment key={date}>
            <tr>
              <td className="wb-param-cell--toggle">
                <RowToggle
                  rowId={rowId}
                  open={open}
                  onToggle={toggleExpanded}
                  label={
                    <>
                      {scopeOf(kinds) === "mixed" ? (
                        <span className="wb-param-date__kind">
                          {scopeColumnTitle(kinds[dates.indexOf(date)] ?? "person")}
                        </span>
                      ) : null}
                      <span className="wb-param-date">{formatDate(date)}</span>
                      {names[date] ? (
                        <span className="wb-param-date__name">{names[date]}</span>
                      ) : null}
                    </>
                  }
                />
              </td>
              {rows.map((row) => (
                <td key={`${row.systemId}:${row.key}`} className="wb-param-value">
                  {matrix[date]?.[row.systemId]?.[row.key] ?? "—"}
                </td>
              ))}
            </tr>
            {open && (
              <tr className="wb-param-detail">
                {/* Трактування стоїть у стовпці свого параметра, як і у вигляді
                    «Параметри»: клітинка під підписом дати порожня. */}
                <td />
                {rows.map((row) => (
                  <td key={`${row.systemId}:${row.key}`}>
                    {details[date]?.[row.systemId]?.[row.key]?.meaning ?? "—"}
                  </td>
                ))}
              </tr>
            )}
          </Fragment>
        );
      })}
      {rows.length === 0 && <EmptyRow colSpan={rows.length + 1} />}
    </tbody>
  );
}

/**
 * Спільні ширини стовпців: останній власної не має — він добирає залишок,
 * коли таблиця вужча за рамку. Числа дає `usePinnedHead`: обидві таблиці
 * міряються разом, інакше вони розійшлися б стовпцями. Інлайн лишається тільки
 * на виміряній ширині: це число з виміру, а не оформлення.
 */
function ColumnWidths({ widths }: { widths: number[] }) {
  return (
    <colgroup>
      {widths.map((width, index) => (
        <col key={index} style={index === widths.length - 1 ? undefined : { width }} />
      ))}
    </colgroup>
  );
}

/**
 * Таблиця розділена на дві: шапка — окремою смугою під закріпленим
 * перемикачем, тіло — під нею і гортається вбік. Чому саме так — у
 * `usePinnedHead`.
 */
export function AnalysisTable({ view, ...data }: { view: AnalysisView } & TableData) {
  const expansion = useExpansion();
  const head = usePinnedHead();

  const scope = scopeOf(data.kinds);
  const columns = (view === "dates" ? data.rows.length : data.dates.length) + 1;
  // Міра з попереднього вигляду до нової таблиці не належить: поки кількість
  // ширин не збіглася з кількістю стовпців, таблиці лишаються на розкладці за
  // вмістом — інакше чужі ширини тримали б стовпці, яких уже немає.
  const measured = head.widths.length === columns;
  const total = head.widths.reduce((sum, width) => sum + width, 0);

  const className = `wb-param-table wb-param-table--compare${
    measured ? " wb-param-table--measured" : ""
  }`;
  const style = measured ? { width: `max(100%, ${total}px)` } : undefined;

  return (
    <div className="wb-param-frame">
      <div className="wb-param-pin">
        <div className="wb-param-head" ref={head.headRef}>
          <table className={className} style={style} ref={head.copyRef}>
            {measured && <ColumnWidths widths={head.widths} />}
            {view === "dates" ? (
              <DatesHead rows={data.rows} scope={scope} />
            ) : (
              <ParamsHead dates={data.dates} names={data.names} kinds={data.kinds} />
            )}
          </table>
        </div>
      </div>

      <div className="wb-param-scroll" ref={head.scrollRef} onScroll={head.onScroll}>
        <table className={`${className} wb-param-table--body`} style={style} ref={head.bodyRef}>
          {measured && <ColumnWidths widths={head.widths} />}
          {view === "dates" ? (
            <DatesRows {...data} {...expansion} />
          ) : (
            <ParamsRows {...data} {...expansion} />
          )}
        </table>
      </div>
    </div>
  );
}
