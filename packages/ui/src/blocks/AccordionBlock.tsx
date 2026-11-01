/**
 * Page Builder — Accordion Block.
 *
 * Expandable/collapsible sections. Supports single or multiple open panels.
 *
 * @module packages/ui/src/blocks/AccordionBlock
 */

import { useState, useCallback } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface AccordionItem {
  title: string;
  content: string;
  open?: boolean;
}

export function AccordionBlock({ block }: BlockComponentProps) {
  const { items = [], multiple = false } = block.props as {
    items?: AccordionItem[];
    multiple?: boolean;
  };

  const [openSet, setOpenSet] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    items.forEach((item, i) => {
      if (item.open) initial.add(i);
    });
    return initial;
  });

  const toggle = useCallback(
    (index: number) => {
      setOpenSet((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          if (!multiple) next.clear();
          next.add(index);
        }
        return next;
      });
    },
    [multiple],
  );

  if (items.length === 0) return null;

  return (
    <div className="wb-block-accordion">
      {items.map((item, i) => {
        const isOpen = openSet.has(i);

        return (
          <div
            key={i}
            className={`wb-block-accordion__item${isOpen ? " wb-block-accordion__item--open" : ""}`}
          >
            <button type="button" onClick={() => toggle(i)} className="wb-block-accordion__trigger">
              <span>{item.title}</span>
              <span className="wb-block-accordion__chevron" aria-hidden="true">
                ▾
              </span>
            </button>

            {isOpen && (
              <div className="wb-block-accordion__content wb-text-secondary">{item.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
