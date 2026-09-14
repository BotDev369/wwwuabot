/**
 * ScenarioCardModal — єдиний модальний блок редагування сценарію.
 *
 * Вкладки: Сторінка (замовч.), Бот-Річ+Кнопки, Бот+Кнопки, Спільне, Поділитись
 * Підвкладки: Прев'ю (замовч.), JSON, Конструктор
 *
 * Тут лише розмітка-каркас: стан і збереження — `useScenarioCard`, шапка й
 * вкладки — окремі компоненти, тіло — `ScenarioCardBody`. Рядок адресується
 * **номером** (`id`) або адресою (`slug`), бо адресу тепер редагують.
 */

import { registerAllBlocks } from "@wwwuabot/ui/blocks";
import { SaveActionButtons } from "@wwwuabot/shared";
import { FullscreenBuilder } from "./FullscreenBuilder";
import { ScenarioCardBody } from "./ScenarioCardBody";
import { ScenarioCardHeader } from "./ScenarioCardHeader";
import { MainTabs, SubTabs } from "./ScenarioCardTabs";
import { useScenarioCard } from "./useScenarioCard";
import type { SubTab } from "./scenario-modal-types";

// Блоки Page Builder реєструються один раз на завантаженні модуля.
registerAllBlocks();

interface Props {
  slug: string;
  onClose: () => void;
  onSaved: () => void;
  initialSubTab?: SubTab;
}

export function ScenarioCardModal({ slug, onClose, onSaved, initialSubTab }: Props) {
  const card = useScenarioCard({ slug, onSaved, onClose, initialSubTab });

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div
        className="wb-modal scn-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 900,
          width: "100%",
          height: "90dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <ScenarioCardHeader slug={slug} rowId={card.allFields.id} onClose={onClose} />

        <MainTabs active={card.mainTab} onSelect={card.selectMainTab} />

        {card.mainTab !== "share" && (
          <SubTabs
            active={card.subTab}
            onSelect={card.selectSubTab}
            onOpenJson={card.openJsonTab}
          />
        )}

        <ScenarioCardBody
          mainTab={card.mainTab}
          subTab={card.subTab}
          slug={slug}
          allFields={card.allFields}
          loading={card.loading}
          error={card.error}
          updateField={card.updateField}
          onFullscreen={card.openFullscreen}
          json={card.json}
          saving={card.saving}
          onSaveJson={() => void card.handleSave(false)}
        />

        {card.fullscreenBuilder && (
          <FullscreenBuilder
            slug={slug}
            allFields={card.allFields}
            updateField={card.updateField}
            onClose={card.closeFullscreen}
            onSave={(shouldClose) => card.handleSave(shouldClose)}
            saving={card.saving}
            savingAction={card.savingAction}
            saved={card.justSaved}
          />
        )}

        {/* Єдиний модуль дій збереження та закриття. */}
        <div className="wb-modal-footer">
          <SaveActionButtons
            onSaveAndClose={() => card.handleSave(true)}
            onSave={() => card.handleSave(false)}
            onClose={onClose}
            saving={card.saving}
            savingAction={card.savingAction}
            loading={card.loading}
            saved={card.justSaved}
            success={card.success}
          />
        </div>
      </div>
    </div>
  );
}
