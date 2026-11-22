/**
 * «Про магазин» — текст продавця під каталогом.
 *
 * Кожен блок сторінки, крім сітки товарів і заголовка, стає окремим розділом
 * зі своєю шапкою: три абзаци в спільній панелі читались як один текст.
 * @module web-platform-dev/src/pages/shop/store
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { ZoneRenderer } from "@wwwuabot/ui/ZoneRenderer";
import type { BlockContext, PageConfig } from "@wwwuabot/shared/types/page-config";
import { storeSections } from "./store-view";

/** Тип блока, який малює каталог: решта блоків — текст про магазин. */
const GRID_BLOCK = "shop-grid";

export interface ShopAboutProps {
  config: PageConfig;
  context: BlockContext;
}

export function ShopAbout({ config, context }: ShopAboutProps): ReactElement | null {
  const info = (config.zones?.main ?? []).filter((block) => {
    if (block.type === GRID_BLOCK) return false;
    if (block.id === "head" || block.id?.endsWith("-head")) return false;
    return true;
  });
  const sections = storeSections(info);
  if (sections.length === 0) return null;

  return (
    <section className="shop-store-info" id="shop-store-about">
      {sections.map((item) => (
        <article className="shop-section" key={item.id}>
          {item.title && (
            <header className="shop-section-head">
              <span className="shop-section-icon" aria-hidden="true">
                <Icon name={item.icon} size={16} />
              </span>
              <h3 className="shop-section-title">{item.title}</h3>
            </header>
          )}
          {item.blocks.length > 0 && (
            <ZoneRenderer
              blocks={item.blocks}
              zone="main"
              context={context}
              className="shop-section-body"
            />
          )}
        </article>
      ))}
    </section>
  );
}
