import { BotConstructor } from "./BotConstructor";
import { BotRichConstructor } from "./BotRichConstructor";
import { ScenarioJsonEditor } from "./ScenarioJsonEditor";
import { TabPreview } from "./ScenarioPreview";
import { ShareTab } from "./ShareTab";
import { SharedFieldsEditor } from "./SharedFieldsEditor";
import { WebConstructor } from "./WebConstructor";
import type { MainTab, SubTab } from "./scenario-modal-types";
import type { ScenarioJsonEditor as ScenarioJsonEditorState } from "./useScenarioJsonEditor";

export function ScenarioCardBody({
  mainTab,
  subTab,
  slug,
  allFields,
  loading,
  error,
  saving,
  updateField,
  onFullscreen,
  onSaveJson,
  json,
}: {
  mainTab: MainTab;
  subTab: SubTab;
  slug: string;
  allFields: Record<string, unknown>;
  loading: boolean;
  error: string | null;
  saving: boolean;
  updateField: (key: string, value: unknown) => void;
  onFullscreen: () => void;
  onSaveJson: () => void;
  json: ScenarioJsonEditorState;
}) {
  const renderConstructor = () => {
    if (mainTab === "shared")
      return <SharedFieldsEditor fields={allFields} updateField={updateField} />;
    if (mainTab === "bot") return <BotConstructor fields={allFields} updateField={updateField} />;
    if (mainTab === "bot_rich")
      return <BotRichConstructor fields={allFields} updateField={updateField} />;
    if (mainTab === "web")
      return (
        <WebConstructor
          fields={allFields}
          updateField={updateField}
          slug={slug}
          onFullscreen={onFullscreen}
        />
      );
    return (
      <div style={{ padding: 16, color: "var(--text-muted)", textAlign: "center" }}>
        Немає конструктора для цієї вкладки
      </div>
    );
  };

  const isEmpty = Object.keys(allFields).length === 0;

  return (
    <div className="wb-modal-body" style={{ flex: 1, overflow: "auto" }}>
      {loading ? (
        <div className="wb-modal-loading">Завантаження…</div>
      ) : error && isEmpty ? (
        <div className="wb-modal-error">{error}</div>
      ) : mainTab === "share" ? (
        <ShareTab slug={slug} fields={allFields} />
      ) : subTab === "preview" ? (
        <TabPreview mainTab={mainTab} fields={allFields} slug={slug} />
      ) : subTab === "json" ? (
        <ScenarioJsonEditor
          jsonText={json.text}
          jsonError={json.error}
          copied={json.copied}
          applied={json.applied}
          saving={saving}
          textareaRef={json.textareaRef}
          onChange={json.change}
          onCopy={json.copy}
          onFormat={json.format}
          onApply={json.apply}
          onSave={onSaveJson}
        />
      ) : subTab === "constructor" ? (
        renderConstructor()
      ) : null}

      {error && !isEmpty && (
        <div className="wb-modal-error" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
