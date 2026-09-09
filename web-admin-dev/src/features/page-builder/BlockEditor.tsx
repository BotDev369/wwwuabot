/**
 * Block Editor — редактор одного блоку в зоні (акордеон).
 */

import { useMemo, useState, useCallback } from "react";
import { BLOCK_DEFINITIONS, getBlockDefinition } from "@wwwuabot/shared/constants/block-definitions";
import type { PageBlock, BlockZone, BlockContext, BlockConditions } from "@wwwuabot/shared/types/page-config";
import { BlockEditorHeader } from "./BlockEditorHeader";
import { BlockEditorContent } from "./BlockEditorContent";

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

export function BlockEditor({
  block, zone, context, onUpdateProps, onUpdateName, onUpdateConditions,
  onRemove, onChangeType, onAddChild, onRemoveChild,
  onUpdateChildProps, onUpdateChildName, onUpdateChildConditions, depth = 0,
}: BlockEditorProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [showConditions, setShowConditions] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(block.name ?? "");

  const definition = useMemo(() => getBlockDefinition(block.type), [block.type]);
  const availableTypes = useMemo(
    () => BLOCK_DEFINITIONS.filter((def) => def.compatibleZones.length === 0 || def.compatibleZones.includes(zone)),
    [zone],
  );

  const hasConditions = !!block.conditions && (
    (block.conditions.role && block.conditions.role.length > 0) ||
    (block.conditions.tariff && block.conditions.tariff.length > 0) ||
    (block.conditions.status && block.conditions.status.length > 0) ||
    block.conditions.minDiscount !== undefined ||
    (block.conditions.permissions && block.conditions.permissions.length > 0)
  );

  const displayName = block.name || definition?.label || block.type;

  const commitName = useCallback(() => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (trimmed !== (block.name ?? "")) onUpdateName(block.id, trimmed);
  }, [nameDraft, block.id, block.name, onUpdateName]);

  return (
    <div
      className="pb-block-editor"
      style={{
        border: hasConditions ? "1px solid var(--accent, #6366f1)" : "1px solid var(--border)",
        borderRadius: 6, marginBottom: 4, marginLeft: depth * 12,
        background: depth > 0 ? "var(--bg-tertiary, #f8f9fa)" : "var(--bg-primary)", overflow: "hidden",
      }}
    >
      <BlockEditorHeader
        collapsed={collapsed} displayName={displayName} blockType={block.type}
        definitionLabel={definition?.label} definitionIcon={definition?.icon}
        hasConditions={!!hasConditions} showConditions={showConditions}
        childrenCount={block.children?.length ?? 0}
        editingName={editingName} nameDraft={nameDraft}
        onToggle={() => setCollapsed((prev) => !prev)}
        onToggleConditions={() => setShowConditions((prev) => !prev)}
        onRemove={() => onRemove(block.id)}
        onStartEditName={() => setEditingName(true)}
        onNameDraftChange={setNameDraft}
        onCommitName={commitName}
        onCancelEditName={() => { setNameDraft(block.name ?? ""); setEditingName(false); }}
      />
      {!collapsed && (
        <BlockEditorContent
          block={block} zone={zone} context={context} definition={definition}
          showConditions={showConditions} availableTypes={availableTypes}
          onUpdateProps={onUpdateProps} onUpdateConditions={onUpdateConditions}
          onChangeType={onChangeType} onAddChild={onAddChild} onRemoveChild={onRemoveChild}
          onUpdateChildProps={onUpdateChildProps} onUpdateChildName={onUpdateChildName}
          onUpdateChildConditions={onUpdateChildConditions}
          depth={depth} BlockEditorComponent={BlockEditor}
        />
      )}
    </div>
  );
}
