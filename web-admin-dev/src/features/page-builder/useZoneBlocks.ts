/**
 * useZoneBlocks — hook for block CRUD operations within a zone.
 */

import { useCallback } from "react";
import type { PageBlock, BlockZone, BlockConditions } from "@wwwuabot/shared/types/page-config";
import { generateBlockId } from "@wwwuabot/shared/types/page-config";
import { getDefaultProps } from "@wwwuabot/shared/constants/block-definitions";

interface UseZoneBlocksOptions {
  zone: BlockZone;
  blocks: PageBlock[];
  onUpdateBlocks: (zone: BlockZone, blocks: PageBlock[]) => void;
}

export function useZoneBlocks({ zone, blocks, onUpdateBlocks }: UseZoneBlocksOptions) {
  const handleAddBlock = useCallback(
    (type: string) => {
      const newBlock: PageBlock = {
        id: generateBlockId(),
        type,
        order: blocks.length,
        props: getDefaultProps(type),
      };
      onUpdateBlocks(zone, [...blocks, newBlock]);
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleRemoveBlock = useCallback(
    (blockId: string) => {
      const updated = blocks.filter((b) => b.id !== blockId);
      updated.forEach((b, i) => {
        b.order = i;
      });
      onUpdateBlocks(zone, updated);
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleMoveUp = useCallback(
    (blockId: string) => {
      const sorted = [...blocks].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((b) => b.id === blockId);
      if (idx <= 0) return;
      [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
      sorted.forEach((b, i) => {
        b.order = i;
      });
      onUpdateBlocks(zone, sorted);
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleMoveDown = useCallback(
    (blockId: string) => {
      const sorted = [...blocks].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((b) => b.id === blockId);
      if (idx === -1 || idx >= sorted.length - 1) return;
      [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      sorted.forEach((b, i) => {
        b.order = i;
      });
      onUpdateBlocks(zone, sorted);
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleUpdateProps = useCallback(
    (blockId: string, props: Record<string, unknown>) => {
      onUpdateBlocks(
        zone,
        blocks.map((b) => (b.id === blockId ? { ...b, props } : b)),
      );
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleUpdateName = useCallback(
    (blockId: string, name: string) => {
      onUpdateBlocks(
        zone,
        blocks.map((b) => (b.id === blockId ? { ...b, name } : b)),
      );
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleUpdateConditions = useCallback(
    (blockId: string, conditions: BlockConditions | undefined) => {
      onUpdateBlocks(
        zone,
        blocks.map((b) => (b.id === blockId ? { ...b, conditions } : b)),
      );
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleUpdateChildConditions = useCallback(
    (parentId: string, childId: string, conditions: BlockConditions | undefined) => {
      onUpdateBlocks(
        zone,
        blocks.map((b) => {
          if (b.id !== parentId) return b;
          return {
            ...b,
            children: (b.children ?? []).map((c) => (c.id === childId ? { ...c, conditions } : c)),
          };
        }),
      );
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleChangeType = useCallback(
    (blockId: string, newType: string) => {
      onUpdateBlocks(
        zone,
        blocks.map((b) =>
          b.id === blockId ? { ...b, type: newType, props: getDefaultProps(newType) } : b,
        ),
      );
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleAddChild = useCallback(
    (parentId: string, type: string) => {
      onUpdateBlocks(
        zone,
        blocks.map((b) => {
          if (b.id !== parentId) return b;
          const children = b.children ?? [];
          const newChild: PageBlock = {
            id: generateBlockId(),
            type,
            order: children.length,
            props: getDefaultProps(type),
          };
          return { ...b, children: [...children, newChild] };
        }),
      );
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleRemoveChild = useCallback(
    (parentId: string, childId: string) => {
      onUpdateBlocks(
        zone,
        blocks.map((b) => {
          if (b.id !== parentId) return b;
          const children = (b.children ?? []).filter((c) => c.id !== childId);
          children.forEach((c, i) => {
            c.order = i;
          });
          return { ...b, children };
        }),
      );
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleUpdateChildProps = useCallback(
    (parentId: string, childId: string, props: Record<string, unknown>) => {
      onUpdateBlocks(
        zone,
        blocks.map((b) => {
          if (b.id !== parentId) return b;
          return {
            ...b,
            children: (b.children ?? []).map((c) => (c.id === childId ? { ...c, props } : c)),
          };
        }),
      );
    },
    [zone, blocks, onUpdateBlocks],
  );

  const handleUpdateChildName = useCallback(
    (parentId: string, childId: string, name: string) => {
      onUpdateBlocks(
        zone,
        blocks.map((b) => {
          if (b.id !== parentId) return b;
          return {
            ...b,
            children: (b.children ?? []).map((c) => (c.id === childId ? { ...c, name } : c)),
          };
        }),
      );
    },
    [zone, blocks, onUpdateBlocks],
  );

  return {
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
  };
}
