/**
 * Page Builder — FAQ Block.
 *
 * A specialized accordion for frequently asked questions with a section title.
 * Uses internally the same expand/collapse pattern as AccordionBlock.
 *
 * @module packages/ui/src/blocks/FaqBlock
 */

import { useState, useCallback } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqBlock({ block }: BlockComponentProps) {
  const { items = [], title = "Часті питання" } = block.props as {
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
      {title && <h3 className="wb-block-faq__title">{title}</h3>}

      {items.map((item, i) => {
        const isOpen = openSet.has(i);

        return (
          <div key={i} className={`wb-block-faq__item${isOpen ? " wb-block-faq__item--open" : ""}`}>
            <button type="button" onClick={() => toggle(i)} className="wb-block-faq__question">
              <span>{item.question}</span>
              <span className="wb-block-faq__chevron" aria-hidden="true">
                ▾
              </span>
            </button>

            {isOpen && (
              <div className="wb-block-faq__answer wb-block-faq__answer--open">{item.answer}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
