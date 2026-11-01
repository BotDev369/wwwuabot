/**
 * Zone Editor — редактор однієї зони (sidebar, header, main, footer).
 *
 * Вигляд — класи `pb-zone*` у `styles/admin/page-builder.css`.
 */

import { useMemo, useState } from "react";
import type {
  BlockZone,
  PageBlock,
  BlockContext,
  SidebarSettings,
} from "@wwwuabot/shared/types/page-config";
import { getBlocksForZone } from "@wwwuabot/shared/constants/block-definitions";
import { icons } from "@wwwuabot/shared";
import { BlockEditor } from "./BlockEditor";
import { useZoneBlocks } from "./useZoneBlocks";
import { SidebarSettingsPanel } from "./SidebarSettings";

const ZONE_LABELS: Record<BlockZone, string> = {
  sidebar: "Sidebar",
  header: "Header",
  main: "Main",
  footer: "Footer",
};

interface ZoneEditorProps {
  zone: BlockZone;
  blocks: PageBlock[];
  context: BlockContext;
  onUpdateBlocks: (zone: BlockZone, blocks: PageBlock[]) => void;
  onAddBlock?: (zone: BlockZone) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  sidebarSettings?: SidebarSettings;
  onUpdateSidebarSettings?: (settings: SidebarSettings) => void;
}

export function ZoneEditor({
  zone,
  blocks,
  context,
  onUpdateBlocks,
  onAddBlock,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  sidebarSettings,
  onUpdateSidebarSettings,
}: ZoneEditorProps) {
  const [localCollapsed, setLocalCollapsed] = useState(true);
  const isControlled = typeof controlledCollapsed === "boolean";
  const collapsed = isControlled ? controlledCollapsed : localCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setLocalCollapsed((prev) => !prev);
  };

  const availableTypes = useMemo(() => getBlocksForZone(zone), [zone]);
  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.order - b.order), [blocks]);

  const {
    handleAddBlock,
    handleRemoveBlock,
    handleMoveUp,
    handleMoveDown,
    handleUpdateProps,
    handleUpdateName,
    handleUpdateConditions,
    handleUpdateChildConditions,
    handleChangeType,
    handleAddChild,
    handleRemoveChild,
    handleUpdateChildProps,
    handleUpdateChildName,
  } = useZoneBlocks({ zone, blocks, onUpdateBlocks });

  return (
    <div className="pb-zone-editor">
      {/* Zone header */}
      <div className="pb-zone__head" onClick={handleToggle}>
        <div className="pb-zone__head-left">
          <span className="pb-zone__caret">{collapsed ? "▸" : "▾"}</span>
          <span className="pb-zone__title">{ZONE_LABELS[zone]}</span>
          <span className="pb-zone__count">{blocks.length}</span>
        </div>
      </div>

      {/* Zone content */}
      {!collapsed && (
        <div className="pb-zone__body">
          {zone === "sidebar" && onUpdateSidebarSettings && (
            <SidebarSettingsPanel settings={sidebarSettings} onUpdate={onUpdateSidebarSettings} />
          )}

          {sortedBlocks.length === 0 ? (
            <div className="pb-zone__empty">Зона порожня. Додайте блок нижче.</div>
          ) : (
            <div className="pb-zone__list">
              {sortedBlocks.map((block, index) => (
                <div key={block.id} className="pb-zone__row">
                  <div className="pb-block-move">
                    <button
                      type="button"
                      className="wb-move-btn"
                      onClick={() => handleMoveUp(block.id)}
                      disabled={index === 0}
                      title="Вгору"
                    >
                      {icons["chevron-up"]}
                    </button>
                    <button
                      type="button"
                      className="wb-move-btn"
                      onClick={() => handleMoveDown(block.id)}
                      disabled={index === sortedBlocks.length - 1}
                      title="Вниз"
                    >
                      {icons["chevron-down"]}
                    </button>
                  </div>
                  <div className="pb-zone__block">
                    <BlockEditor
                      block={block}
                      zone={zone}
                      context={context}
                      onUpdateProps={handleUpdateProps}
                      onUpdateName={handleUpdateName}
                      onUpdateConditions={handleUpdateConditions}
                      onRemove={handleRemoveBlock}
                      onChangeType={handleChangeType}
                      onAddChild={handleAddChild}
                      onRemoveChild={handleRemoveChild}
                      onUpdateChildProps={handleUpdateChildProps}
                      onUpdateChildName={handleUpdateChildName}
                      onUpdateChildConditions={handleUpdateChildConditions}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add block button */}
          <div className="pb-zone__add">
            {onAddBlock ? (
              <button
                className="wb-btn wb-btn-secondary pb-zone__add-btn"
                onClick={() => onAddBlock(zone)}
              >
                + Додати блок
              </button>
            ) : (
              <div className="pb-zone__add-list">
                {availableTypes.map((def) => (
                  <button
                    key={def.type}
                    className="wb-btn wb-btn-secondary"
                    onClick={() => handleAddBlock(def.type)}
                    title={def.description}
                  >
                    + {def.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
