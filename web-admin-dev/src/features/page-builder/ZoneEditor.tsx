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
  BlockConditions,
  SidebarSettings,
} from "@wwwuabot/shared/types/page-config";
import { generateBlockId } from "@wwwuabot/shared/types/page-config";
import {
  getBlocksForZone,
  getDefaultProps,
} from "@wwwuabot/shared/constants/block-definitions";
import { icons } from "@wwwuabot/shared";
import { BlockEditor } from "./BlockEditor";

const ZONE_LABELS: Record<BlockZone, string> = {
  sidebar: "Sidebar",
  header: "Header",
  main: "Main",
  footer: "Footer",
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

  /** Callback: відкрити модалку додавання блоку для цієї зони. */
  onAddBlock?: (zone: BlockZone) => void;

  /** Чи згорнута зона (акордеон закритий). Якщо не передано — використовується внутрішній стан. */
  collapsed?: boolean;

  /** Callback перемикання акордеона. */
  onToggleCollapse?: () => void;
  /** Налаштування для сайдбару (якщо zone === "sidebar"). */
  sidebarSettings?: SidebarSettings;
  /** Callback: змінити налаштування сайдбару. */
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
  // За замовчуванням всі акордеони закриті (collapsed = true)
  const [localCollapsed, setLocalCollapsed] = useState(true);

  const isControlled = typeof controlledCollapsed === "boolean";
  const collapsed = isControlled ? controlledCollapsed : localCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalCollapsed((prev) => !prev);
    }
  };

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

  // Оновити назву блоку
  const handleUpdateName = (blockId: string, name: string) => {
    const updated = blocks.map((b) =>
      b.id === blockId ? { ...b, name } : b,
    );
    onUpdateBlocks(zone, updated);
  };

  // Оновити умови блоку
  const handleUpdateConditions = (blockId: string, conditions: BlockConditions | undefined) => {
    const updated = blocks.map((b) =>
      b.id === blockId ? { ...b, conditions } : b,
    );
    onUpdateBlocks(zone, updated);
  };

  // Оновити умови дочірнього блоку (рекурсивно)
  const handleUpdateChildConditions = (
    parentId: string,
    childId: string,
    conditions: BlockConditions | undefined,
  ) => {
    const updated = blocks.map((b) => {
      if (b.id !== parentId) return b;
      return {
        ...b,
        children: (b.children ?? []).map((c) =>
          c.id === childId ? { ...c, conditions } : c,
        ),
      };
    });
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

  // Оновити назву дочірнього блоку
  const handleUpdateChildName = (
    parentId: string,
    childId: string,
    name: string,
  ) => {
    const updated = blocks.map((b) => {
      if (b.id !== parentId) return b;
      const children = (b.children ?? []).map((c) =>
        c.id === childId ? { ...c, name } : c,
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
          background: "var(--bg-2)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={handleToggle}
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
              background: "var(--bg-3)",
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
          {/* Налаштування зони Сайдбар */}
          {zone === "sidebar" && (
            <div
              className="pb-sidebar-settings"
              style={{
                padding: "10px 14px",
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                marginBottom: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-primary)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", width: 14, height: 14, flexShrink: 0, color: "var(--text-secondary)" }}>{icons["home"]}</span>
                <span>Налаштування сайдбару</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 12,
                }}
              >
                {/* Позиція кнопки закриття: Зліва / Справа */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                    Кнопка "закрити"
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className={`kb-toggle-btn${(sidebarSettings?.closeButtonPosition ?? "left") === "left" ? " kb-toggle-btn--active" : ""}`}
                      onClick={() =>
                        onUpdateSidebarSettings?.({
                          ...sidebarSettings,
                          closeButtonPosition: "left",
                        })
                      }
                      style={{
                        fontSize: 12,
                        padding: "4px 12px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Зліва
                    </button>
                    <button
                      type="button"
                      className={`kb-toggle-btn${sidebarSettings?.closeButtonPosition === "right" ? " kb-toggle-btn--active" : ""}`}
                      onClick={() =>
                        onUpdateSidebarSettings?.({
                          ...sidebarSettings,
                          closeButtonPosition: "right",
                        })
                      }
                      style={{
                        fontSize: 12,
                        padding: "4px 12px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Справа
                    </button>
                  </div>
                </div>

                {/* Розмір тексту пунктів меню */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                    Розмір тексту (пункти меню)
                  </label>
                  <select
                    className="wb-input"
                    value={sidebarSettings?.fontSize ?? "sm"}
                    onChange={(e) =>
                      onUpdateSidebarSettings?.({
                        ...sidebarSettings,
                        fontSize: e.target.value,
                      })
                    }
                    style={{
                      fontSize: 12,
                      padding: "5px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "var(--bg-1)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="xs">12px (XS — Дрібний)</option>
                    <option value="sm">14px (S — Звичайний)</option>
                    <option value="base">16px (M — Середній)</option>
                    <option value="lg">18px (L — Великий)</option>
                    <option value="xl">20px (XL — Дуже великий)</option>
                  </select>
                </div>

                {/* Відступи між пунктами */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                    Відступи між пунктами
                  </label>
                  <select
                    className="wb-input"
                    value={sidebarSettings?.itemSpacing ?? "sm"}
                    onChange={(e) =>
                      onUpdateSidebarSettings?.({
                        ...sidebarSettings,
                        itemSpacing: e.target.value,
                      })
                    }
                    style={{
                      fontSize: 12,
                      padding: "5px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "var(--bg-1)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="none">0px (Без відступу)</option>
                    <option value="xs">4px (Компактний)</option>
                    <option value="sm">8px (Стандартний)</option>
                    <option value="md">12px (Середній)</option>
                    <option value="lg">16px (Просторий)</option>
                    <option value="xl">24px (Широкий)</option>
                  </select>
                </div>
              </div>
            </div>
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

          {/* Кнопка додавання блоку */}
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
