/**
 * Page Builder — Accordion Block.
 *
 * Expandable/collapsible sections. Supports single or multiple open panels.
 *
 * @module packages/ui/src/blocks/AccordionBlock
 */

import { useState, useCallback } from 'react';
import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface AccordionItem {
  title: string;
  content: string;
  open?: boolean;
}

export function AccordionBlock({ block }: BlockComponentProps) {
  const {
    items = [],
    multiple = false,
  } = block.props as {
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

  const toggle = useCallback((index: number) => {
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
  }, [multiple]);

  if (items.length === 0) return null;

  return (
    <div className="wb-block-accordion">
      {items.map((item, i) => {
        const isOpen = openSet.has(i);

        return (
          <div
            key={i}
            className="wb-block-accordion__item"
            style={{
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              className="wb-block-accordion__trigger"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--sp-3) 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: 'var(--weight-semibold)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
              }}
            >
              <span>{item.title}</span>
              <span
                style={{
                  transition: 'transform var(--duration-fast) var(--ease)',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}
              >
                ▾
              </span>
            </button>

            {isOpen && (
              <div
                className="wb-block-accordion__content wb-text-secondary"
                style={{
                  padding: '0 0 var(--sp-3) 0',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 'var(--font-lineheight-3)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
