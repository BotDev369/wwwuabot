/**
 * Block Editor — редактор одного блоку в зоні.
 *
 * Дозволяє:
 * - Змінювати тип блоку
 * - Редагувати props (генерується форма з JSON Schema)
 * - Додавати/видаляти вкладені блоки
 * - Переміщати блок між зонами
 * - Встановлювати умови показу (role, tariff, status, discount, permissions)
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
import { icons } from "@wwwuabot/shared";

const ico = (name: keyof typeof icons, size = 14) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

const AVAILABLE_ROLES = ["user", "moderator", "admin", "vip"];
const AVAILABLE_TARIFFS = ["free", "basic", "pro", "enterprise"];
const AVAILABLE_STATUSES = ["active", "pending", "suspended"];
const AVAILABLE_PERMISSIONS = ["analytics", "export", "messaging", "settings", "users", "billing"];

interface BlockEditorProps {
  /** Блок для редагування. */
  block: PageBlock;

  /** Зона, в якій знаходиться блок. */
  zone: BlockZone;

  /** Контекст сторінки. */
  context: BlockContext;

  /** Callback: оновити props блоку. */
  onUpdateProps: (blockId: string, props: Record<string, unknown>) => void;

  /** Callback: оновити умови блоку. */
  onUpdateConditions: (blockId: string, conditions: BlockConditions | undefined) => void;

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

  /** Callback: оновити умови дочірнього блоку. */
  onUpdateChildConditions: (
    parentId: string,
    childId: string,
    conditions: BlockConditions | undefined,
  ) => void;

  /** Рівень вкладеності (для візуального відступу). */
  depth?: number;
}

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

  const handleAddChild = () => {
    onAddChild(block.id, "text");
  };

  // ── Conditions helpers ──
  const conditions = block.conditions;
  const hasConditions = !!conditions && (
    (conditions.role && conditions.role.length > 0) ||
    (conditions.tariff && conditions.tariff.length > 0) ||
    (conditions.status && conditions.status.length > 0) ||
    conditions.minDiscount !== undefined ||
    (conditions.permissions && conditions.permissions.length > 0)
  );

  function updateConditions(patch: Partial<BlockConditions>) {
    const current = block.conditions ?? {};
    const next = { ...current, ...patch };

    // Clean up empty arrays
    if (next.role && next.role.length === 0) delete next.role;
    if (next.tariff && next.tariff.length === 0) delete next.tariff;
    if (next.status && next.status.length === 0) delete next.status;
    if (next.minDiscount === undefined || next.minDiscount === 0) delete next.minDiscount;
    if (next.permissions && next.permissions.length === 0) delete next.permissions;

    const isEmpty = !next.role && !next.tariff && !next.status && !next.minDiscount && !next.permissions;
    onUpdateConditions(block.id, isEmpty ? undefined : next);
  }

  function toggleArrayValue(field: "role" | "tariff" | "status" | "permissions", value: string) {
    const arr = (conditions?.[field] as string[] | undefined) ?? [];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    updateConditions({ [field]: next });
  }

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
          {hasConditions && (
            <span style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 4,
              background: "var(--accent, #6366f1)",
              color: "#fff",
              fontWeight: 600,
            }}>
              CONDITIONS
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setShowConditions(!showConditions)}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              border: `1px solid ${showConditions ? "var(--accent, #6366f1)" : "var(--border)"}`,
              background: showConditions ? "var(--accent, #6366f1)" : "transparent",
              color: showConditions ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
            }}
            title="Умови показу"
          >
            {ico("eye", 12)} Умови
          </button>
          <button
            className="wb-btn wb-btn-danger"
            onClick={() => onRemove(block.id)}
            style={{ fontSize: 12, padding: "2px 8px" }}
            title="Видалити блок"
          >
            {ico("trash", 12)}
          </button>
        </div>
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

      {/* ═══ CONDITIONS PANEL ═══ */}
      {showConditions && (
        <div style={{
          marginBottom: 12,
          padding: 10,
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--bg-secondary, #f9fafb)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            {ico("eye")} Умови показу блоку
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>
            Блок показується тільки якщо ВСІ умови виконуються. Якщо жодна не вказана — блок показується завжди.
          </div>

          {/* Role */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Роль</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {AVAILABLE_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleArrayValue("role", r)}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: `1px solid ${(conditions?.role ?? []).includes(r) ? "var(--accent, #6366f1)" : "var(--border)"}`,
                    background: (conditions?.role ?? []).includes(r) ? "var(--accent, #6366f1)" : "transparent",
                    color: (conditions?.role ?? []).includes(r) ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Tariff */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Тариф</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {AVAILABLE_TARIFFS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleArrayValue("tariff", t)}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: `1px solid ${(conditions?.tariff ?? []).includes(t) ? "var(--accent, #6366f1)" : "var(--border)"}`,
                    background: (conditions?.tariff ?? []).includes(t) ? "var(--accent, #6366f1)" : "transparent",
                    color: (conditions?.tariff ?? []).includes(t) ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Статус</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {AVAILABLE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleArrayValue("status", s)}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: `1px solid ${(conditions?.status ?? []).includes(s) ? "var(--accent, #6366f1)" : "var(--border)"}`,
                    background: (conditions?.status ?? []).includes(s) ? "var(--accent, #6366f1)" : "transparent",
                    color: (conditions?.status ?? []).includes(s) ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Min Discount */}
          <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, minWidth: 80 }}>Мін. знижка (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={conditions?.minDiscount ?? ""}
              placeholder="0"
              onChange={(e) => {
                const v = Number(e.target.value);
                updateConditions({ minDiscount: v > 0 ? v : undefined });
              }}
              style={{
                width: 60,
                fontSize: 12,
                padding: "2px 6px",
                border: "1px solid var(--border)",
                borderRadius: 4,
              }}
            />
          </div>

          {/* Permissions */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Дозволи</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {AVAILABLE_PERMISSIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleArrayValue("permissions", p)}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: `1px solid ${(conditions?.permissions ?? []).includes(p) ? "var(--accent, #6366f1)" : "var(--border)"}`,
                    background: (conditions?.permissions ?? []).includes(p) ? "var(--accent, #6366f1)" : "transparent",
                    color: (conditions?.permissions ?? []).includes(p) ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
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
              className="wb-btn wb-btn-secondary"
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
                    onUpdateConditions={(childId, conditions) =>
                      onUpdateChildConditions(block.id, childId, conditions)
                    }
                    onRemove={(childId) => onRemoveChild(block.id, childId)}
                    onChangeType={(_, newType) => {
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
                    onUpdateChildConditions={(childId, grandChildId, conditions) =>
                      onUpdateChildConditions(childId, grandChildId, conditions)
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
