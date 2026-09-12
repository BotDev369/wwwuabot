/**
 * BlockEditorContent — вміст акордеона блоку (опис, умови, props, дочірні блоки).
 */

import type {
  PageBlock,
  BlockZone,
  BlockContext,
  BlockConditions,
} from "@wwwuabot/shared/types/page-config";
import { ConditionsPanel } from "./ConditionsPanel";
import { SchemaField } from "./SchemaField";

interface BlockEditorContentProps {
  block: PageBlock;
  zone: BlockZone;
  context: BlockContext;
  definition?: { type: string; description?: string; schema?: Record<string, unknown> };
  showConditions: boolean;
  availableTypes: Array<{ type: string; label: string }>;
  onUpdateProps: (blockId: string, props: Record<string, unknown>) => void;
  onUpdateConditions: (blockId: string, conditions: BlockConditions | undefined) => void;
  onChangeType: (blockId: string, newType: string) => void;
  onAddChild: (parentId: string, type: string) => void;
  onRemoveChild: (parentId: string, childId: string) => void;
  onUpdateChildProps: (parentId: string, childId: string, props: Record<string, unknown>) => void;
  onUpdateChildName: (parentId: string, childId: string, name: string) => void;
  onUpdateChildConditions: (
    parentId: string,
    childId: string,
    conditions: BlockConditions | undefined,
  ) => void;
  depth: number;
  // Recursive BlockEditor component
  BlockEditorComponent: React.ComponentType<{
    block: PageBlock;
    zone: BlockZone;
    context: BlockContext;
    depth?: number;
    onUpdateProps: (blockId: string, props: Record<string, unknown>) => void;
    onUpdateName: (blockId: string, name: string) => void;
    onUpdateConditions: (blockId: string, conditions: BlockConditions | undefined) => void;
    onRemove: (blockId: string) => void;
    onChangeType: (blockId: string, newType: string) => void;
    onAddChild: (parentId: string, type: string) => void;
    onRemoveChild: (parentId: string, childId: string) => void;
    onUpdateChildProps: (parentId: string, childId: string, props: Record<string, unknown>) => void;
    onUpdateChildName: (parentId: string, childId: string, name: string) => void;
    onUpdateChildConditions: (
      parentId: string,
      childId: string,
      conditions: BlockConditions | undefined,
    ) => void;
  }>;
}

export function BlockEditorContent({
  block,
  zone,
  context,
  definition,
  showConditions,
  availableTypes,
  onUpdateProps,
  onUpdateConditions,
  onChangeType,
  onAddChild,
  onRemoveChild,
  onUpdateChildProps,
  onUpdateChildName,
  onUpdateChildConditions,
  depth,
  BlockEditorComponent,
}: BlockEditorContentProps) {
  const handlePropChange = (key: string, value: unknown) => {
    onUpdateProps(block.id, { ...block.props, [key]: value });
  };

  return (
    <div style={{ padding: 10, borderTop: "1px solid var(--border)" }}>
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

      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}
      >
        <select
          value={block.type}
          onChange={(e) => onChangeType(block.id, e.target.value)}
          style={{
            fontSize: 13,
            padding: "4px 8px",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--bg-1)",
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

      {showConditions && (
        <ConditionsPanel
          conditions={block.conditions}
          onUpdate={(conditions) => onUpdateConditions(block.id, conditions)}
        />
      )}

      <div className="pb-be-props">
        <SchemaField props={block.props} schema={definition?.schema} onChange={handlePropChange} />
      </div>

      {definition?.type !== "divider" && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
              flexWrap: "wrap",
              gap: 6,
            }}
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
                  <BlockEditorComponent
                    key={child.id}
                    block={child}
                    zone={zone}
                    context={context}
                    depth={depth + 1}
                    onUpdateProps={(childId, props) => onUpdateChildProps(block.id, childId, props)}
                    onUpdateName={(childId, name) => onUpdateChildName(block.id, childId, name)}
                    onUpdateConditions={(childId, conditions) =>
                      onUpdateChildConditions(block.id, childId, conditions)
                    }
                    onRemove={(childId) => onRemoveChild(block.id, childId)}
                    onChangeType={(_, newType) => {
                      onUpdateChildProps(block.id, child.id, { ...child.props, _newType: newType });
                    }}
                    onAddChild={(_, type) => onAddChild(block.id, type)}
                    onRemoveChild={(childId, grandChildId) => onRemoveChild(childId, grandChildId)}
                    onUpdateChildProps={(childId, grandChildId, props) =>
                      onUpdateChildProps(childId, grandChildId, props)
                    }
                    onUpdateChildName={(childId, grandChildId, name) =>
                      onUpdateChildName(childId, grandChildId, name)
                    }
                    onUpdateChildConditions={(childId, grandChildId, conditions) =>
                      onUpdateChildConditions(childId, grandChildId, conditions)
                    }
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
