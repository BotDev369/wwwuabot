/**
 * Zone Editor — редактор однієї зони (sidebar, header, main, footer).
 */

import { useMemo, useState } from "react";
import type {
  BlockZone,
  PageBlock,
  BlockContext,
  SidebarSettings,
} from "@wwwuabot/shared/types/page-config";
import { getBlocksForZone } from "@wwwuabot/shared/constants/block-definitions";
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
    <div
      className="pb-zone-editor"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {/* Zone header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "var(--bg-3)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={handleToggle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{collapsed ? "▸" : "▾"}</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{ZONE_LABELS[zone]}</span>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--bg-4)",
              padding: "1px 6px",
              borderRadius: 10,
            }}
          >
            {blocks.length}
          </span>
        </div>
      </div>

      {/* Zone content */}
      {!collapsed && (
        <div style={{ padding: 12 }}>
          {zone === "sidebar" && onUpdateSidebarSettings && (
            <SidebarSettingsPanel settings={sidebarSettings} onUpdate={onUpdateSidebarSettings} />
          )}

          {sortedBlocks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 20,
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              Зона порожня. Додайте блок нижче.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {sortedBlocks.map((block, index) => (
                <div key={block.id} style={{ display: "flex", gap: 4 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 12 }}>
                    <button
                      onClick={() => handleMoveUp(block.id)}
                      disabled={index === 0}
                      style={{
                        fontSize: 10,
                        padding: "2px 4px",
                        cursor: index === 0 ? "default" : "pointer",
                        opacity: index === 0 ? 0.3 : 1,
                      }}
                      title="Вгору"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveDown(block.id)}
                      disabled={index === sortedBlocks.length - 1}
                      style={{
                        fontSize: 10,
                        padding: "2px 4px",
                        cursor: index === sortedBlocks.length - 1 ? "default" : "pointer",
                        opacity: index === sortedBlocks.length - 1 ? 0.3 : 1,
                      }}
                      title="Вниз"
                    >
                      ▼
                    </button>
                  </div>
                  <div style={{ flex: 1 }}>
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
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px dashed var(--border)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {onAddBlock ? (
              <button
                className="wb-btn wb-btn-secondary"
                onClick={() => onAddBlock(zone)}
                style={{ fontSize: 12, padding: "6px 16px" }}
              >
                + Додати блок
              </button>
            ) : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {availableTypes.map((def) => (
                  <button
                    key={def.type}
                    className="wb-btn wb-btn-secondary"
                    onClick={() => handleAddBlock(def.type)}
                    style={{ fontSize: 12, padding: "4px 10px" }}
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
