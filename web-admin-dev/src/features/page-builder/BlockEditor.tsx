/**
 * Block Editor — редактор одного блоку в зоні.
 *
 * Тепер кожен блок — акордеон (згорнутий за замовчуванням).
 * Заголовок акордеона містить:
 *   - Стрілку-хеврон (▸/▾)
 *   - Іконку типу блоку
 *   - Назву блоку (inline-editable)
 *   - Бейдж типу
 *   - Бейдж conditions (якщо є)
 *   - Кнопки дій (умови, видалення)
 *
 * Вміст (опис, умови, props, вкладені блоки) — тільки коли розгорнуто.
 *
 * Підкомпоненти винесені в окремі файли:
 * - ConditionsPanel.tsx — панель умов показу
 * - SchemaField.tsx — рендер полів за JSON Schema
 */

import { useMemo, useState, useCallback } from "react";
import {
  BLOCK_DEFINITIONS,
  getBlockDefinition,
} from "@wwwuabot/shared/constants/block-definitions";
import type {
  PageBlock,
  BlockZone,
  BlockContext,
  BlockConditions,
} from "@wwwuabot/shared/types/page-config";
import { icons, type IconName } from "@wwwuabot/shared";
import { ConditionsPanel } from "./ConditionsPanel";
import { SchemaField } from "./SchemaField";

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 14) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface BlockEditorProps {
  block: PageBlock;
  zone: BlockZone;
  context: BlockContext;
  onUpdateProps: (blockId: string, props: Record<string, unknown>) => void;
  onUpdateName: (blockId: string, name: string) => void;
  onUpdateConditions: (blockId: string, conditions: BlockConditions | undefined) => void;
  onRemove: (blockId: string) => void;
  onChangeType: (blockId: string, newType: string) => void;
  onAddChild: (parentId: string, type: string) => void;
  onRemoveChild: (parentId: string, childId: string) => void;
  onUpdateChildProps: (parentId: string, childId: string, props: Record<string, unknown>) => void;
  onUpdateChildName: (parentId: string, childId: string, name: string) => void;
  onUpdateChildConditions: (parentId: string, childId: string, conditions: BlockConditions | undefined) => void;
  depth?: number;
}

// ── Component ─────────────────────────────────────────────────────

export function BlockEditor({
  block,
  zone,
  context,
  onUpdateProps,
  onUpdateName,
  onUpdateConditions,
  onRemove,
  onChangeType,
  onAddChild,
  onRemoveChild,
  onUpdateChildProps,
  onUpdateChildName,
  onUpdateChildConditions,
  depth = 0,
}: BlockEditorProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [showConditions, setShowConditions] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(block.name ?? "");

  const definition = useMemo(() => getBlockDefinition(block.type), [block.type]);

  const availableTypes = useMemo(
    () => BLOCK_DEFINITIONS.filter(
      (def) => def.compatibleZones.length === 0 || def.compatibleZones.includes(zone),
    ),
    [zone],
  );

  const hasConditions = !!block.conditions && (
    (block.conditions.role && block.conditions.role.length > 0) ||
    (block.conditions.tariff && block.conditions.tariff.length > 0) ||
    (block.conditions.status && block.conditions.status.length > 0) ||
    block.conditions.minDiscount !== undefined ||
    (block.conditions.permissions && block.conditions.permissions.length > 0)
  );

  // Display name: block.name || definition.label || block.type
  const displayName = block.name || definition?.label || block.type;

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeType(block.id, e.target.value);
  };

  const handlePropChange = (key: string, value: unknown) => {
    onUpdateProps(block.id, { ...block.props, [key]: value });
  };

  // Inline name editing
  const commitName = useCallback(() => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (trimmed !== (block.name ?? "")) {
      onUpdateName(block.id, trimmed);
    }
  }, [nameDraft, block.id, block.name, onUpdateName]);

  return (
    <div
      className="pb-block-editor"
      style={{
        border: hasConditions ? "1px solid var(--accent, #6366f1)" : "1px solid var(--border)",
        borderRadius: 8,
        marginBottom: 8,
        marginLeft: depth * 16,
        background: depth > 0 ? "var(--bg-tertiary, #f8f9fa)" : "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* ── Accordion Header ── */}
      <div
        className="pb-be-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          background: collapsed
            ? "var(--bg-secondary, #f1f5f9)"
            : "var(--bg-tertiary, #f0f2f5)",
          cursor: "pointer",
          userSelect: "none",
          transition: "background 0.15s ease",
        }}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        {/* Chevron */}
        <span
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            transition: "transform 0.15s ease",
            transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
            flexShrink: 0,
          }}
        >
          ▸
        </span>

        {/* Type icon */}
        {definition?.icon && (
          <span style={{ flexShrink: 0, color: "var(--text-secondary)" }}>
            {ico(definition.icon as IconName, 16)}
          </span>
        )}

        {/* Block name (click to edit) */}
        {editingName ? (
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setNameDraft(block.name ?? "");
                setEditingName(false);
              }
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              fontWeight: 600,
              padding: "2px 6px",
              border: "1px solid var(--accent, #6366f1)",
              borderRadius: 4,
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title="Натисніть щоб змінити назву"
            onClick={(e) => {
              e.stopPropagation();
              setEditingName(true);
            }}
          >
            {displayName}
          </span>
        )}

        {/* Type badge */}
        <span
          style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 4,
            background: "var(--bg-secondary, #e2e8f0)",
            color: "var(--text-secondary)",
            fontWeight: 500,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {definition?.label ?? block.type}
        </span>

        {/* Conditions badge */}
        {hasConditions && (
          <span
            style={{
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: 4,
              background: "var(--accent, #6366f1)",
              color: "#fff",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            COND
          </span>
        )}

        {/* Children count */}
        {block.children && block.children.length > 0 && (
          <span
            style={{
              fontSize: 10,
              padding: "1px 5px",
              borderRadius: 4,
              background: "var(--bg-tertiary, #e2e8f0)",
              color: "var(--text-secondary)",
              flexShrink: 0,
            }}
          >
            {block.children.length}
          </span>
        )}

        {/* Action buttons — right side */}
        <div
          className="pb-be-actions"
          style={{ display: "flex", gap: 2, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowConditions(!showConditions)}
            className="pb-be-cond-btn"
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              border: `1px solid ${showConditions ? "var(--accent, #6366f1)" : "var(--border)"}`,
              background: showConditions ? "var(--accent, #6366f1)" : "transparent",
              color: showConditions ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title="Умови показу"
          >
            {ico("eye", 11)}
          </button>
          <button
            className="wb-btn wb-btn-danger pb-be-del-btn"
            onClick={() => onRemove(block.id)}
            style={{ fontSize: 11, padding: "2px 6px" }}
            title="Видалити блок"
          >
            {ico("trash", 11)}
          </button>
        </div>
      </div>

      {/* ── Accordion Content (only when expanded) ── */}
      {!collapsed && (
        <div style={{ padding: 12 }}>
          {/* Description */}
          {definition?.description && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, fontStyle: "italic" }}>
              {definition.description}
            </div>
          )}

          {/* Type selector + ID row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <select
              value={block.type}
              onChange={handleTypeChange}
              style={{
                fontSize: 13,
                padding: "4px 8px",
                border: "1px solid var(--border)",
                borderRadius: 4,
                background: "var(--bg-primary)",
              }}
            >
              {availableTypes.map((def) => (
                <option key={def.type} value={def.type}>{def.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              id: {block.id.slice(0, 8)}
            </span>
          </div>

          {/* Conditions panel (extracted component) */}
          {showConditions && (
            <ConditionsPanel
              conditions={block.conditions}
              onUpdate={(conditions) => onUpdateConditions(block.id, conditions)}
            />
          )}

          {/* Props (extracted component) */}
          <div className="pb-be-props" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SchemaField props={block.props} schema={definition?.schema} onChange={handlePropChange} />
          </div>

          {/* Children */}
          {definition?.type !== "divider" && (
            <div style={{ marginTop: 12 }}>
              <div
                className="pb-be-children-header"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}
              >
                <span style={{ fontSize: 12, fontWeight: 500 }}>
                  Вкладені блоки ({block.children?.length ?? 0})
                </span>
                <button
                  className="wb-btn wb-btn-secondary pb-be-add-btn"
                  onClick={() => onAddChild(block.id, "text")}
                  style={{ fontSize: 11, padding: "4px 10px", whiteSpace: "nowrap" }}
                >
                  + Додати
                </button>
              </div>

              {block.children && block.children.length > 0 && (
                <div style={{ marginLeft: 8 }}>
                  {block.children
                    .sort((a, b) => a.order - b.order)
                    .map((child) => (
                      <BlockEditor
                        key={child.id}
                        block={child}
                        zone={zone}
                        context={context}
                        onUpdateProps={(childId, props) => onUpdateChildProps(block.id, childId, props)}
                        onUpdateName={(childId, name) => onUpdateChildName(block.id, childId, name)}
                        onUpdateConditions={(childId, conditions) => onUpdateChildConditions(block.id, childId, conditions)}
                        onRemove={(childId) => onRemoveChild(block.id, childId)}
                        onChangeType={(_, newType) => {
                          onUpdateChildProps(block.id, child.id, { ...child.props, _newType: newType });
                        }}
                        onAddChild={(_, type) => onAddChild(block.id, type)}
                        onRemoveChild={(childId, grandChildId) => onRemoveChild(childId, grandChildId)}
                        onUpdateChildProps={(childId, grandChildId, props) => onUpdateChildProps(childId, grandChildId, props)}
                        onUpdateChildName={(childId, grandChildId, name) => onUpdateChildName(childId, grandChildId, name)}
                        onUpdateChildConditions={(childId, grandChildId, conditions) => onUpdateChildConditions(childId, grandChildId, conditions)}
                        depth={depth + 1}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
