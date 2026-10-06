/**
 * Таблиця параметрів системи: рядок — акордеон, тіло — два стовпці.
 *
 * Згорнутий рядок каже два факти — параметр і значення; пояснення й трактування
 * чекають дотику, бо це довгі тексти. Шапку закріплено.
 *
 * @module packages/ui/src/blocks/date-analysis/SystemParameterTable
 */

import { Icon } from "@wwwuabot/shared";
import { useExpansion } from "@wwwuabot/ui/hooks";
import type { AnalysisSystem, SystemResult } from "../mydate/api";

type Parameter = SystemResult["parameters"][number];

function ParameterRow({
  parameter,
  open,
  onToggle,
}: {
  parameter: Parameter;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        <td className="wb-param-cell--toggle">
          <button
            type="button"
            className={open ? "wb-param-toggle wb-param-toggle--open" : "wb-param-toggle"}
            aria-expanded={open}
            onClick={onToggle}
          >
            <span>{parameter.label}</span>
            <span className="wb-param-toggle__caret">
              <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
            </span>
          </button>
        </td>
        <td className="wb-param-value">{parameter.value}</td>
      </tr>
      {open && (
        <tr className="wb-param-detail">
          <td>
            <span className="wb-param-detail__caption">Пояснення параметра</span>
            {parameter.about ?? "—"}
          </td>
          <td>
            <span className="wb-param-detail__caption">Трактування значення</span>
            {parameter.meaning ?? "—"}
          </td>
        </tr>
      )}
    </>
  );
}

export function SystemParameterTable({
  system,
  result,
  parameterKeys,
}: {
  system: AnalysisSystem;
  result: SystemResult | undefined;
  parameterKeys: string[];
}) {
  const { isExpanded, toggleExpanded } = useExpansion();
  const parameters = (result?.parameters ?? []).filter(
    (parameter) => parameterKeys.length === 0 || parameterKeys.includes(parameter.key),
  );

  return (
    <section>
      <h3 className="wb-analysis-systems__name">{system.name}</h3>

      {result ? (
        <>
          <div className="wb-param-frame">
            <table className="wb-param-table">
              <thead>
                <tr>
                  <th scope="col">Параметр</th>
                  <th scope="col">Значення</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((parameter) => (
                  <ParameterRow
                    key={parameter.key}
                    parameter={parameter}
                    open={isExpanded(parameter.key)}
                    onToggle={() => toggleExpanded(parameter.key)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {result.comingSoon.length > 0 && (
            <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-2)" }}>
              Скоро підключимо: {result.comingSoon.join(", ")}
            </p>
          )}
        </>
      ) : (
        <p className="wb-text-sm wb-text-muted" style={{ margin: 0 }}>
          {system.description}
        </p>
      )}
    </section>
  );
}
