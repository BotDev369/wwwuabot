/**
 * Page Builder — AnalysisSystemsBlock: вітрина «Системи аналізу».
 *
 * Перший стовпець таблиці аналізу без дат: система закрита — тільки назва.
 * На дотик відкривається опис, історія й підакордеони параметрів; сам блок —
 * теж акордеон (`CollapsibleSection`).
 * @module packages/ui/src/blocks/AnalysisSystemsBlock
 */

import { Fragment } from "react";
import { Icon } from "@wwwuabot/shared";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { useExpansion } from "@wwwuabot/ui/hooks";
import { CollapsibleSection } from "./collapsible-section";
import { useAnalysisSystems } from "./analysis-systems/useAnalysisSystems";

export function AnalysisSystemsBlock({ block }: BlockComponentProps) {
  const { title = "Системи аналізу" } = block.props as { title?: string };
  const { systems, loading, error } = useAnalysisSystems();
  const { isExpanded, toggleExpanded } = useExpansion();

  return (
    <CollapsibleSection title={title}>
      {loading && <p className="wb-text-sm wb-text-muted">Завантажуємо системи...</p>}

      {error && <p className="wb-text-sm wb-text-muted">{error}</p>}

      {!loading && !error && systems.length === 0 && (
        <p className="wb-text-sm wb-text-muted">Систем аналізу поки немає.</p>
      )}

      {systems.length > 0 && (
        <div className="wb-param-frame">
          <table className="wb-param-table">
            <tbody>
              {systems.map((system) => {
                const open = isExpanded(system.id);
                const parameters = system.parameters ?? [];
                return (
                  <Fragment key={system.id}>
                    <tr className="wb-param-group">
                      <td className="wb-param-cell--toggle">
                        <button
                          type="button"
                          className={
                            open ? "wb-param-toggle wb-param-toggle--open" : "wb-param-toggle"
                          }
                          aria-expanded={open}
                          onClick={() => toggleExpanded(system.id)}
                        >
                          <span className="wb-analysis-systems__head">
                            <span className="wb-analysis-systems__name">{system.name}</span>
                            {!system.implemented && (
                              <span className="wb-analysis-systems__soon">скоро</span>
                            )}
                          </span>
                          <span className="wb-param-toggle__caret">
                            <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
                          </span>
                        </button>
                      </td>
                    </tr>

                    {open && (
                      <tr className="wb-system-body">
                        <td>
                          {system.description ? (
                            <p className="wb-analysis-systems__desc">{system.description}</p>
                          ) : null}

                          {system.history ? (
                            <p className="wb-analysis-systems__history">{system.history}</p>
                          ) : null}

                          {parameters.length > 0 && (
                            <div className="wb-system-params">
                              {parameters.map((parameter) => {
                                const rowId = `${system.id}:${parameter.key}`;
                                const paramOpen = isExpanded(rowId);
                                // Акордеон має сенс лише там, де є що розкривати:
                                // без пояснення підпис параметра лишається
                                // підписом, а не кнопкою в порожнечу.
                                if (!parameter.about) {
                                  return (
                                    <p key={rowId} className="wb-param-label">
                                      {parameter.label}
                                    </p>
                                  );
                                }
                                return (
                                  <Fragment key={rowId}>
                                    <button
                                      type="button"
                                      className={
                                        paramOpen
                                          ? "wb-param-toggle wb-param-toggle--open"
                                          : "wb-param-toggle"
                                      }
                                      aria-expanded={paramOpen}
                                      onClick={() => toggleExpanded(rowId)}
                                    >
                                      <span>{parameter.label}</span>
                                      <span className="wb-param-toggle__caret">
                                        <Icon
                                          name={paramOpen ? "chevron-up" : "chevron-down"}
                                          size={16}
                                        />
                                      </span>
                                    </button>
                                    {paramOpen && (
                                      <p className="wb-param-note">{parameter.about}</p>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </div>
                          )}

                          {parameters.length === 0 && system.implemented && (
                            <p className="wb-text-sm wb-text-muted">
                              Розрахунок цієї системи ще не готовий.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleSection>
  );
}
