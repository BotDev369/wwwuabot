/**
 * Block Editor — редактор одного блоку в зоні.
 *
 * Дозволяє:
 * - Змінювати тип блоку
 * - Редагувати props (генерується форма з JSON Schema)
 * - Додавати/видаляти вкладені блоки
 * - Переміщати блок між зонами
 */

import { useMemo } from "react";
import {
  BLOCK_DEFINITIONS,
  getBlockDefinition,
} from "@wwwuabot/shared/constants/block-definitions";
import type {
  PageBlock,
  BlockZone,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import { generateBlockId } from "@wwwuabot/shared/types/page-config";
import { ZoneRenderer } from "@wwwuabot/ui/ZoneRenderer";

interface BlockEditorProps {
  /** Блок для редагування. */
  block: PageBlock;

  /** Зона, в якій знаходиться блок. */
  zone: BlockZone;

  /** Контекст сторінки. */
  context: BlockContext;

  /** Callback: оновити props блоку. */
  onUpdateProps: (blockId: string, props: Record<string, unknown>) => void;

  /** Callback: видалити блок. */
  onRemove: (blockId: string) => void;

  /** Callback: змінити тип блоку. */
  onChangeType: (blockId: string, newType: string) => void;

  /** Callback: додати дочірній блок. */
  onAddChild: (parentId: string, type: string) => void;

  /** Callback: видалити дочірній блок. */
  onRemoveChild: (parentId: string, childId: string) => void;

  /** Callback: оновити props дочірнього блоку. */
  onUpdateChildProps: (
    parentId: string,
    childId: string,
    props: Record<string, unknown>,
  ) => void;

  /** Рівень вкладеності (для візуального відступу). */
  depth?: number;
}

export function BlockEditor({
  block,
  zone,
  context,
  onUpdateProps,
  onRemove,
  onChangeType,
  onAddChild,
  onRemoveChild,
  onUpdateChildProps,
  depth = 0,
}: BlockEditorProps) {
  const definition = useMemo(
    () => getBlockDefinition(block.type),
    [block.type],
  );

  // Доступні типи для цієї зони
  const availableTypes = useMemo(
    () =>
      BLOCK_DEFINITIONS.filter(
        (def) =>
          def.compatibleZones.length === 0 ||
          def.compatibleZones.includes(zone),
      ),
    [zone],
  );

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeType(block.id, e.target.value);
  };

  const handlePropChange = (key: string, value: unknown) => {
    onUpdateProps(block.id, { ...block.props, [key]: value });
  };

  const handleAddChild = () {
    // Додаємо текстовий блок за замовчуванням
    onAddChild(block.id, "text");
  }

  return (
    <div
      className="pb-block-editor"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: 12,
        marginBottom: 8,
        marginLeft: depth * 16,
        background: depth > 0 ? "var(--bg-tertiary, #f8f9fa)" : "var(--bg-primary)",
      }}
    >
      {/* Заголовок блоку */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              <option key={def.type} value={def.type}>
                {def.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            id: {block.id.slice(0, 8)}
          </span>
        </div>
        <button
          className="btn btn--danger"
          onClick={() => onRemove(block.id)}
          style={{ fontSize: 12, padding: "2px 8px" }}
          title="Видалити блок"
        >
          🗑️
        </button>
      </div>

      {/* Опис блоку */}
      {definition?.description && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 8,
            fontStyle: "italic",
          }}
        >
          {definition.description}
        </div>
      )}

      {/* Props */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {renderPropsFields(block.props, definition?.schema, handlePropChange)}
      </div>

      {/* Вкладені блоки */}
      {definition?.type !== "divider" && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500 }}>
              Вкладені блоки ({block.children?.length ?? 0})
            </span>
            <button
              className="btn btn--secondary"
              onClick={handleAddChild}
              style={{ fontSize: 11, padding: "2px 8px" }}
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
                    onUpdateProps={(childId, props) =>
                      onUpdateChildProps(block.id, childId, props)
                    }
                    onRemove={(childId) => onRemoveChild(block.id, childId)}
                    onChangeType={(_, newType) => {
                      // Зміна типу дочірнього блоку
                      onUpdateChildProps(block.id, child.id, {
                        ...child.props,
                        _newType: newType,
                      });
                    }}
                    onAddChild={(_, type) => onAddChild(block.id, type)}
                    onRemoveChild={(childId, grandChildId) =>
                      onRemoveChild(childId, grandChildId)
                    }
                    onUpdateChildProps={(childId, grandChildId, props) =>
                      onUpdateChildProps(childId, grandChildId, props)
                    }
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

/**
 * Рендер полів для props на основі JSON Schema.
 */
function renderPropsFields(
  props: Record<string, unknown>,
  schema: Record<string, unknown> | undefined,
  onChange: (key: string, value: unknown) => void,
): React.ReactNode {
  if (!schema || typeof schema !== "object" || !schema.properties) {
    // Fallback: простий список key=value
    return Object.entries(props).map(([key, value]) => (
      <div key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ fontSize: 12, minWidth: 100, color: "var(--text-secondary)" }}>
          {key}
        </label>
        <input
          type="text"
          value={typeof value === "string" ? value : JSON.stringify(value ?? "")}
          onChange={(e) => {
            const val = e.target.value;
            // Спробуємо розпARSити JSON
            try {
              onChange(key, JSON.parse(val));
            } catch {
              onChange(key, val);
            }
          }}
          style={{
            flex: 1,
            fontSize: 13,
            padding: "4px 8px",
            border: "1px solid var(--border)",
            borderRadius: 4,
          }}
        />
      </div>
    ));
  }

  const properties = schema.properties as Record<string, Record<string, unknown>>;

  return Object.entries(properties).map(([key, propSchema]) => {
    const currentValue = props[key];
    const title = (propSchema.title as string) ?? key;
    const type = propSchema.type as string;

    if (type === "boolean") {
      return (
        <div key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, minWidth: 100, color: "var(--text-secondary)" }}>
            {title}
          </label>
          <input
            type="checkbox"
            checked={!!currentValue}
            onChange={(e) => onChange(key, e.target.checked)}
          />
        </div>
      );
    }

    if (type === "string" && Array.isArray(propSchema.enum)) {
      return (
        <div key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, minWidth: 100, color: "var(--text-secondary)" }}>
            {title}
          </label>
          <select
            value={String(currentValue ?? propSchema.default ?? "")}
            onChange={(e) => onChange(key, e.target.value)}
            style={{
              fontSize: 13,
              padding: "4px 8px",
              border: "1px solid var(--border)",
              borderRadius: 4,
            }}
          >
            {(propSchema.enum as string[]).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (type === "array") {
      // Для масивів — JSON textarea
      return (
        <div key={key} style={{ display: "flex", gap: 8, flexDirection: "column" }}>
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {title}
          </label>
          <textarea
            value={
              typeof currentValue === "string"
                ? currentValue
                : JSON.stringify(currentValue ?? [], null, 2)
            }
            onChange={(e) => {
              try {
                onChange(key, JSON.parse(e.target.value));
              } catch {
                onChange(key, e.target.value);
              }
            }}
            rows={4}
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              padding: "6px 8px",
              border: "1px solid var(--border)",
              borderRadius: 4,
            }}
          />
        </div>
      );
    }

    // Default: text input
    return (
      <div key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ fontSize: 12, minWidth: 100, color: "var(--text-secondary)" }}>
          {title}
        </label>
        <input
          type="text"
          value={
            typeof currentValue === "string"
              ? currentValue
              : JSON.stringify(currentValue ?? "")
          }
          onChange={(e) => {
            const val = e.target.value;
            try {
              onChange(key, JSON.parse(val));
            } catch {
              onChange(key, val);
            }
          }}
          style={{
            flex: 1,
            fontSize: 13,
            padding: "4px 8px",
            border: "1px solid var(--border)",
            borderRadius: 4,
          }}
        />
      </div>
    );
  });
}
