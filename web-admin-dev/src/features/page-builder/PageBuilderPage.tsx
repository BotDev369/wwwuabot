/**
 * Page Builder — головна сторінка конструктора сторінок.
 *
 * Вигляд — тільки класами: жодного `style={{}}`, бо числа живуть у
 * `packages/shared/src/styles/admin/page-builder.css`.
 */

import { ALL_ZONES } from "@wwwuabot/shared/types/page-config";
import { Icon, SaveActionButtons } from "@wwwuabot/shared";
import { ZoneEditor } from "./ZoneEditor";
import { usePageBuilder } from "./usePageBuilder";

export function PageBuilderPage() {
  const {
    slug,
    config,
    scenarioTitle,
    loading,
    saveStatus,
    savingAction,
    error,
    jsonMode,
    jsonText,
    jsonError,
    expandedZones,
    allExpanded,
    allCollapsed,
    context,
    setJsonMode,
    setJsonText,
    setJsonError,
    handleToggleZone,
    handleExpandAll,
    handleCollapseAll,
    handleSave,
    handleUpdateZoneBlocks,
    handleExport,
    handleImport,
    handleBack,
  } = usePageBuilder();

  if (!slug) {
    return (
      <div className="pb-page pb-page--empty">
        <p>Codeword не вказано</p>
        <button className="wb-btn wb-btn-secondary" onClick={handleBack}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="pb-page">
      <div className="pb-head">
        <div>
          <h2 className="pb-title">
            <Icon name="blocks" size={18} /> Page Builder: {slug}
          </h2>
          {scenarioTitle && <div className="pb-subtitle">{scenarioTitle}</div>}
        </div>
        <div className="pb-head__actions">
          <button className="wb-btn wb-btn-secondary pb-btn-sm" onClick={handleBack}>
            ← Назад
          </button>
          <button
            className="wb-btn wb-btn-secondary pb-btn-sm"
            onClick={() => setJsonMode(!jsonMode)}
          >
            {jsonMode ? (
              <>
                <Icon name="blocks" size={14} /> Конструктор
              </>
            ) : (
              <>
                <Icon name="wrench" size={14} /> JSON
              </>
            )}
          </button>
          <button className="wb-btn wb-btn-secondary pb-btn-sm" onClick={handleExport}>
            <Icon name="clipboard" size={14} /> Експорт
          </button>
          <SaveActionButtons
            size="sm"
            onSaveAndClose={() => handleSave(true)}
            onSave={() => handleSave(false)}
            onClose={handleBack}
            saving={saveStatus === "saving"}
            savingAction={savingAction}
            saved={saveStatus === "saved"}
          />
        </div>
      </div>

      {error && <div className="pb-error">{error}</div>}

      {loading && <div className="pb-loading">Завантаження…</div>}

      {jsonMode && !loading && (
        <div>
          <div className="pb-json__actions">
            <button
              className="wb-btn wb-btn-secondary pb-btn-sm"
              onClick={() => {
                setJsonText(JSON.stringify(config, null, 2));
                setJsonError(null);
              }}
            >
              <Icon name="refresh" size={14} /> Оновити з конструктора
            </button>
            <button className="wb-btn wb-btn-primary pb-btn-sm" onClick={handleImport}>
              <Icon name="download" size={14} /> Застосувати JSON
            </button>
          </div>
          {jsonError && <div className="pb-json__error">{jsonError}</div>}
          <textarea
            className="pb-json__editor"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}

      {!jsonMode && !loading && (
        <div>
          <div className="pb-zones__bar">
            <span className="pb-zones__count">Зони ({ALL_ZONES.length})</span>
            <div role="group" className="pb-segment">
              <button
                type="button"
                onClick={handleExpandAll}
                className={`pb-segment__btn${allExpanded ? " pb-segment__btn--active" : ""}`}
                title="Розгорнути всі акордеони"
              >
                ▾ Всі відкрито
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className={`pb-segment__btn${allCollapsed ? " pb-segment__btn--active" : ""}`}
                title="Згорнути всі акордеони"
              >
                ▸ Всі закрито
              </button>
            </div>
          </div>
          {ALL_ZONES.map((zone) => (
            <ZoneEditor
              key={zone}
              zone={zone}
              blocks={config.zones[zone]}
              context={context}
              onUpdateBlocks={handleUpdateZoneBlocks}
              collapsed={!expandedZones.has(zone)}
              onToggleCollapse={() => handleToggleZone(zone)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
