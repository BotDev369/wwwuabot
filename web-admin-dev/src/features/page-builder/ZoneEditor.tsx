/**
 * Zone Editor — редактор однієї зони (sidebar, header, main, footer).
 *
 * Показує список блоків у зоні та дозволяє:
 * - Додавати нові блоки
 * - Видаляти блоки
 * - Переміщати блоки вгору/вниз
 */

import { useMemo, useState } from "react";
import type {
  BlockZone,
  PageBlock,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import { generateBlockId } from "@wwwuabot/shared/types/page-config";
import {
  getBlocksForZone,
  getDefaultProps,
} from "@wwwuabot/shared/constants/block-definitions";
import { BlockEditor } from "./BlockEditor";

const ZONE_LABELS: Record<BlockZone, string> = {
  sidebar: "📎 Sidebar",
  header: "📌 Header",
  main: "📄 Main",
  footer: "📎 Footer",
};

interface ZoneEditorProps {
  /** Зона. */
  zone: BlockZone;

  /** Блоки в зоні. */
  blocks: PageBlock[];

  /** Контекст сторінки. */
  context: BlockContext;

  /** Callback: оновити весь список блоків зони. */
  onUpdateBlocks: (zone: BlockZone, blocks: PageBlock[]) => void;
}

export function ZoneEditor({
  zone,
  blocks,
  context,
  onUpdateBlocks,
}: ZoneEditorProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Доступні типи блоків для цієї зони
  const availableTypes = useMemo(() => getBlocksForZone(zone), [zone]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order - b.order),
    [blocks],
  );

  // Додати блок
  const handleAddBlock = (type: string) => {
    const newBlock: PageBlock = {
      id: generateBlockId(),
      type,
      order: blocks.length,
      props: getDefaultProps(type),
    };
    onUpdateBlocks(zone, [...blocks, newBlock]);
  };

  // Видалити блок
  const handleRemoveBlock = (blockId: string) => {
    const updated = blocks.filter((b) => b.id !== blockId);
    updated.forEach((b, i) => {
      b.order = i;
    });
    onUpdateBlocks(zone, updated);
  };

  // Перемістити блок вгору
  const handleMoveUp = (blockId: string) => {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((b) => b.id === blockId);
    if (idx <= 0) return;
    [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
    sorted.forEach((b, i) => {
      b.order = i;
    });
    onUpdateBlocks(zone, sorted);
  };

  // Перемістити блок вниз
  const handleMoveDown = (blockId: string) => {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((b) => b.id === blockId);
    if (idx === -1 || idx >= sorted.length - 1) return;
    [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
    sorted.forEach((b, i) => {
      b.order = i;
    });
    onUpdateBlocks(zone, sorted);
  };

  // Оновити props блоку
  const handleUpdateProps = (blockId: string, props: Record<string, unknown>) => {
    const updated = blocks.map((b) =>
      b.id === blockId ? { ...b, props } : b,
    );
    onUpdateBlocks(zone, updated);
  };

  // Змінити тип блоку
  const handleChangeType = (blockId: string, newType: string) => {
    const updated = blocks.map((b) =>
      b.id === blockId
        ? { ...b, type: newType, props: getDefaultProps(newType) }
        : b,
    );
    onUpdateBlocks(zone, updated);
  };

  // Додати дочірній блок
  const handleAddChild = (parentId: string, type: string) => {
    const updated = blocks.map((b) => {
      if (b.id !== parentId) return b;
      const children = b.children ?? [];
      const newChild: PageBlock = {
        id: generateBlockId(),
        type,
        order: children.length,
        props: getDefaultProps(type),
      };
      return { ...b, children: [...children, newChild] };
    });
    onUpdateBlocks(zone, updated);
  };

  // Видалити дочірній блок
  const handleRemoveChild = (parentId: string, childId: string) => {
    const updated = blocks.map((b) => {
      if (b.id !== parentId) return b;
      const children = (b.children ?? []).filter((c) => c.id !== childId);
      children.forEach((c, i) => {
        c.order = i;
      });
      return { ...b, children };
    });
    onUpdateBlocks(zone, updated);
  };

  // Оновити props дочірнього блоку
  const handleUpdateChildProps = (
    parentId: string,
    childId: string,
    props: Record<string, unknown>,
  ) => {
    const updated = blocks.map((b) => {
      if (b.id !== parentId) return b;
      const children = (b.children ?? []).map((c) =>
        c.id === childId ? { ...c, props } : c,
      );
      return { ...b, children };
    });
    onUpdateBlocks(zone, updated);
  };

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
      {/* Заголовок зони */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "var(--bg-secondary, #f1f5f9)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>
            {collapsed ? "▸" : "▾"}
          </span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {ZONE_LABELS[zone]}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--bg-tertiary)",
              padding: "1px 6px",
              borderRadius: 10,
            }}
          >
            {blocks.length}
          </span>
        </div>
      </div>

      {/* Вміст зони */}
      {!collapsed && (
        <div style={{ padding: 12 }}>
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
                  {/* Кнопки переміщення */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      paddingTop: 12,
                    }}
                  >
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
                        cursor:
                          index === sortedBlocks.length - 1
                            ? "default"
                            : "pointer",
                        opacity: index === sortedBlocks.length - 1 ? 0.3 : 1,
                      }}
                      title="Вниз"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Редактор блоку */}
                  <div style={{ flex: 1 }}>
                    <BlockEditor
                      block={block}
                      zone={zone}
                      context={context}
                      onUpdateProps={handleUpdateProps}
                      onRemove={handleRemoveBlock}
                      onChangeType={handleChangeType}
                      onAddChild={handleAddChild}
                      onRemoveChild={handleRemoveChild}
                      onUpdateChildProps={handleUpdateChildProps}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Кнопки додавання блоків */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px dashed var(--border)",
            }}
          >
            {availableTypes.map((def) => (
              <button
                key={def.type}
                className="btn btn--secondary"
                onClick={() => handleAddBlock(def.type)}
                style={{ fontSize: 12, padding: "4px 10px" }}
                title={def.description}
              >
                + {def.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
