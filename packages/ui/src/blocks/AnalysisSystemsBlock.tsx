/**
 * Page Builder — AnalysisSystemsBlock: вітрина «Системи аналізу».
 *
 * Перший стовпець таблиці аналізу без дат: система, а під нею її параметри
 * акордеонами — значень немає, бо їх рахує сервер за датою. Сам блок — теж
 * акордеон (`CollapsibleSection`).
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
                // У системи без формули параметрів ще немає: порожні підписи
                // роздували б вітрину на екрани прокрутки, а стан системи вже
                // каже позначка «скоро».
                const parameters = system.implemented ? (system.parameters ?? []) : [];
                return (
                  <Fragment key={system.id}>
                    <tr className="wb-param-group">
                      <td>
                        <span className="wb-analysis-systems__name">{system.name}</span>
                        {!system.implemented && (
                          <span className="wb-analysis-systems__soon">скоро</span>
                        )}
                        {system.description ? (
                          <span className="wb-analysis-systems__desc">{system.description}</span>
                        ) : null}
                      </td>
                    </tr>

                    {parameters.map((parameter) => {
                      const rowId = `${system.id}:${parameter.key}`;
                      const open = isExpanded(rowId);
                      // Акордеон має сенс лише там, де є що розкривати: без
                      // пояснення рядок лишається підписом параметра, а не
                      // кнопкою, яка відкриває порожнечу.
                      if (!parameter.about) {
                        return (
                          <tr key={rowId}>
                            <td>{parameter.label}</td>
                          </tr>
                        );
                      }
                      return (
                        <Fragment key={rowId}>
                          <tr>
                            <td className="wb-param-cell--toggle">
                              <button
                                type="button"
                                className={
                                  open ? "wb-param-toggle wb-param-toggle--open" : "wb-param-toggle"
                                }
                                aria-expanded={open}
                                onClick={() => toggleExpanded(rowId)}
                              >
                                <span>{parameter.label}</span>
                                <span className="wb-param-toggle__caret">
                                  <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
                                </span>
                              </button>
                            </td>
                          </tr>
                          {open && (
                            <tr className="wb-param-detail">
                              <td>{parameter.about}</td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}

                    {system.implemented && parameters.length === 0 && (
                      <tr>
                        <td className="wb-text-sm wb-text-muted">
                          Розрахунок цієї системи ще не готовий.
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
