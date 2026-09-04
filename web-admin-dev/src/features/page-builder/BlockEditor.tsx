/**
 * Block Editor — редактор одного блоку в зоні.
 *
 * Дозволяє:
 * - Змінювати тип блоку
 * - Редагувати props (генерується форма з JSON Schema)
 * - Додавати/видаляти вкладені блоки
 * - Переміщати блок між зонами
 * - Встановлювати умови показу (role, tariff, status, discount, permissions)
 *
 * Підкомпоненти винесені в окремі файли:
 * - ConditionsPanel.tsx — панель умов показу
 * - SchemaField.tsx — рендер полів за JSON Schema
 */

import { useMemo, useState } from "react";
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
  onUpdateConditions: (blockId: string, conditions: BlockConditions | undefined) => void;
  onRemove: (blockId: string) => void;
  onChangeType: (blockId: string, newType: string) => void;
  onAddChild: (parentId: string, type: string) => void;
  onRemoveChild: (parentId: string, childId: string) => void;
  onUpdateChildProps: (parentId: string, childId: string, props: Record<string, unknown>) => void;
  onUpdateChildConditions: (parentId: string, childId: string, conditions: BlockConditions | undefined) => void;
  depth?: number;
}

// ── Component ─────────────────────────────────────────────────────

export function BlockEditor({
  block,
  zone,
  context,
  onUpdateProps,
  onUpdateConditions,
  onRemove,
  onChangeType,
  onAddChild,
  onRemoveChild,
  onUpdateChildProps,
  onUpdateChildConditions,
  depth = 0,
}: BlockEditorProps) {
  const [showConditions, setShowConditions] = useState(false);
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

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeType(block.id, e.target.value);
  };

  const handlePropChange = (key: string, value: unknown) => {
    onUpdateProps(block.id, { ...block.props, [key]: value });
  };

  return (
    <div
      className="pb-block-editor"
      style={{
        border: hasConditions ? "1px solid var(--accent, #6366f1)" : "1px solid var(--border)",
        borderRadius: 6,
        padding: 12,
        marginBottom: 8,
        marginLeft: depth * 16,
        background: depth > 0 ? "var(--bg-tertiary, #f8f9fa)" : "var(--bg-primary)",
      }}
    >
      {/* Header */}
      <div
        className="pb-be-header"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={block.type}
            onChange={handleTypeChange}
            style={{ fontSize: 13, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg-primary)" }}
          >
            {availableTypes.map((def) => (
              <option key={def.type} value={def.type}>{def.label}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            id: {block.id.slice(0, 8)}
          </span>
          {hasConditions && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--accent, #6366f1)", color: "#fff", fontWeight: 600 }}>
              CONDITIONS
            </span>
          )}
        </div>
        <div className="pb-be-actions" style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setShowConditions(!showConditions)}
            className="pb-be-cond-btn"
            style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4,
              border: `1px solid ${showConditions ? "var(--accent, #6366f1)" : "var(--border)"}`,
              background: showConditions ? "var(--accent, #6366f1)" : "transparent",
              color: showConditions ? "#fff" : "var(--text-secondary)",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
            title="Умови показу"
          >
            {ico("eye", 12)} Умови
          </button>
          <button
            className="wb-btn wb-btn-danger pb-be-del-btn"
            onClick={() => onRemove(block.id)}
            style={{ fontSize: 12, padding: "2px 8px" }}
            title="Видалити блок"
          >
            {ico("trash", 12)}
          </button>
        </div>
      </div>

      {/* Description */}
      {definition?.description && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, fontStyle: "italic" }}>
          {definition.description}
        </div>
      )}

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
                    onUpdateConditions={(childId, conditions) => onUpdateChildConditions(block.id, childId, conditions)}
                    onRemove={(childId) => onRemoveChild(block.id, childId)}
                    onChangeType={(_, newType) => {
                      onUpdateChildProps(block.id, child.id, { ...child.props, _newType: newType });
                    }}
                    onAddChild={(_, type) => onAddChild(block.id, type)}
                    onRemoveChild={(childId, grandChildId) => onRemoveChild(childId, grandChildId)}
                    onUpdateChildProps={(childId, grandChildId, props) => onUpdateChildProps(childId, grandChildId, props)}
                    onUpdateChildConditions={(childId, grandChildId, conditions) => onUpdateChildConditions(childId, grandChildId, conditions)}
                    depth={depth + 1}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
