/**
 * Page Builder — меню сторінки.
 *
 * Меню — список посилань, а не набір кнопок. Вертикальним воно стає від зони
 * (бічна панель): у вузькій колонці рядок пунктів не читається.
 *
 * @module packages/ui/src/blocks/NavBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { icons, type IconName } from "@wwwuabot/shared";

interface NavItem {
  text: string;
  url?: string;
  icon?: string;
}

export function NavBlock({ block, zone }: BlockComponentProps) {
  const { items = [] } = block.props as { items?: NavItem[] };

  if (items.length === 0) {
    return (
      <nav className="wb-block-nav wb-block-nav--empty">
        Меню (порожнє — додайте посилання у налаштуваннях блоку)
      </nav>
    );
  }

  const direction = zone === "sidebar" ? "vertical" : "horizontal";

  return (
    <nav className={`wb-block-nav wb-block-nav--${direction}`}>
      {items.map((item, i) => {
        const iconKey = item.icon as IconName | undefined;
        const hasSvgIcon = iconKey && iconKey in icons;

        const content = (
          <>
            {hasSvgIcon ? (
              <span className="wb-block-nav__icon">{icons[iconKey]}</span>
            ) : item.icon ? (
              <span className="wb-block-nav__icon">{item.icon}</span>
            ) : null}
            <span>{item.text}</span>
          </>
        );

        if (item.url) {
          return (
            <a key={i} href={item.url} className="wb-block-nav__link">
              {content}
            </a>
          );
        }

        return (
          <span key={i} className="wb-block-nav__item">
            {content}
          </span>
        );
      })}
    </nav>
  );
}
