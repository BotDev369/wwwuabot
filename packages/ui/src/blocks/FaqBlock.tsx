/**
 * Page Builder — FAQ Block.
 *
 * A specialized accordion for frequently asked questions with a section title.
 * Uses internally the same expand/collapse pattern as AccordionBlock.
 *
 * @module packages/ui/src/blocks/FaqBlock
 */

import { useState, useCallback } from 'react';
import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqBlock({ block }: BlockComponentProps) {
  const {
    items = [],
    title = 'Часті питання',
  } = block.props as {
    items?: FaqItem[];
    title?: string;
  };

  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  const toggle = useCallback((index: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="wb-block-faq">
      {title && (
        <h3 className="wb-block-faq__title wb-font-bold wb-mb-4" style={{ fontSize: 'var(--text-xl)' }}>
          {title}
        </h3>
      )}

      {items.map((item, i) => {
        const isOpen = openSet.has(i);

        return (
          <div
            key={i}
            className="wb-block-faq__item"
            style={{
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              className="wb-block-faq__question"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--sp-4) 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: 'var(--weight-semibold)',
                fontSize: 'var(--text-base)',
                color: 'var(--text-primary)',
                gap: 'var(--sp-3)',
              }}
            >
              <span>{item.question}</span>
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
                className="wb-block-faq__answer wb-text-secondary"
                style={{
                  padding: '0 0 var(--sp-4) 0',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 'var(--font-lineheight-3)',
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
