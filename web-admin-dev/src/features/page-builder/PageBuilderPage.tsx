/**
 * Page Builder — головна сторінка конструктора сторінок.
 */

import { ALL_ZONES } from "@wwwuabot/shared/types/page-config";
import { Icon, SaveActionButtons } from "@wwwuabot/shared";
import { ZoneEditor } from "./ZoneEditor";
import { usePageBuilder } from "./usePageBuilder";

export function PageBuilderPage() {
  const {
    codeword,
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

  if (!codeword) {
    return (
      <div style={{ padding: 20 }}>
        <p>Codeword не вказано</p>
        <button className="wb-btn wb-btn-secondary" onClick={handleBack}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          paddingTop: 16,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            <Icon name="blocks" size={18} /> Page Builder: {codeword}
          </h2>
          {scenarioTitle && (
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              {scenarioTitle}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="wb-btn wb-btn-secondary" onClick={handleBack} style={{ fontSize: 13 }}>
            ← Назад
          </button>
          <button
            className="wb-btn wb-btn-secondary"
            onClick={() => setJsonMode(!jsonMode)}
            style={{ fontSize: 13 }}
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
          <button
            className="wb-btn wb-btn-secondary"
            onClick={handleExport}
            style={{ fontSize: 13 }}
          >
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

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "8px 12px",
            background: "var(--color-error-bg, #fef2f2)",
            border: "1px solid var(--color-error, #ef4444)",
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            color: "var(--color-error, #ef4444)",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
          Завантаження…
        </div>
      )}

      {/* JSON mode */}
      {jsonMode && !loading && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              className="wb-btn wb-btn-secondary"
              onClick={() => {
                setJsonText(JSON.stringify(config, null, 2));
                setJsonError(null);
              }}
              style={{ fontSize: 12 }}
            >
              <Icon name="refresh" size={14} /> Оновити з конструктора
            </button>
            <button
              className="wb-btn wb-btn-primary"
              onClick={handleImport}
              style={{ fontSize: 12 }}
            >
              <Icon name="download" size={14} /> Застосувати JSON
            </button>
          </div>
          {jsonError && (
            <div style={{ color: "var(--color-error, #ef4444)", fontSize: 12, marginBottom: 8 }}>
              {jsonError}
            </div>
          )}
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            style={{
              width: "100%",
              minHeight: 500,
              fontFamily: "monospace",
              fontSize: 13,
              padding: 12,
              border: "1px solid var(--border)",
              borderRadius: 6,
              resize: "vertical",
              tabSize: 2,
            }}
            spellCheck={false}
          />
        </div>
      )}

      {/* Constructor */}
      {!jsonMode && !loading && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
              Зони ({ALL_ZONES.length})
            </span>
            <div
              role="group"
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--bg-secondary, #f1f5f9)",
                borderRadius: 6,
                padding: 2,
                gap: 2,
                border: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                onClick={handleExpandAll}
                style={{
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: allExpanded ? 600 : 400,
                  borderRadius: 4,
                  border: "none",
                  background: allExpanded ? "var(--accent, #6366f1)" : "transparent",
                  color: allExpanded ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
                title="Розгорнути всі акордеони"
              >
                ▾ Всі відкрито
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                style={{
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: allCollapsed ? 600 : 400,
                  borderRadius: 4,
                  border: "none",
                  background: allCollapsed ? "var(--accent, #6366f1)" : "transparent",
                  color: allCollapsed ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
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
