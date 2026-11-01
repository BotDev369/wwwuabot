/**
 * Page Builder — Tabs Block.
 *
 * Tab switcher. Each tab shows/hides its content on click.
 *
 * @module packages/ui/src/blocks/TabsBlock
 */

import { useState } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface TabItem {
  label: string;
  icon?: string;
  content?: string;
}

export function TabsBlock({ block }: BlockComponentProps) {
  const { tabs = [] } = block.props as { tabs?: TabItem[] };

  const [activeIndex, setActiveIndex] = useState(0);

  if (tabs.length === 0) return null;

  const activeTab = tabs[activeIndex];

  return (
    <div className="wb-block-tabs">
      <div className="wb-block-tabs__header" role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            className={`wb-block-tabs__tab${i === activeIndex ? " wb-block-tabs__tab--active" : ""}`}
            onClick={() => setActiveIndex(i)}
          >
            {tab.icon && (
              <span className="wb-block-tabs__icon" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="wb-block-tabs__content" role="tabpanel">
        {activeTab?.content || ""}
      </div>
    </div>
  );
}
