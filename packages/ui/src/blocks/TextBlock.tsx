/**
 * Page Builder — Text Block.
 *
 * Displays a title and/or text content with configurable heading level.
 *
 * @module packages/ui/src/blocks/TextBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

/**
 * Рівень заголовка → класи. Назовні, бо те саме співвідношення потрібне тому,
 * хто **малює текст редагованим**: редактор сторінки з шаблону показує блок
 * полем уводу, і без цих класів поле виглядало б інакше за готову сторінку.
 * Друга копія списку розійшлася б із першою на першій же правці вигляду.
 *
 * Розміри — зі шкали токенів, а не власні: шкала одна на продукт
 * (`tokens.css`), тож сторінка з шаблону виглядає доречно в кожній схемі.
 */
export const TEXT_LEVEL_CLASSES: Record<string, string> = {
  h1: "wb-text-2xl wb-font-bold",
  h2: "wb-text-xl wb-font-bold",
  h3: "wb-text-lg wb-font-semibold",
  h4: "wb-text-md wb-font-semibold",
  body: "wb-text-base",
};

export function TextBlock({ block }: BlockComponentProps) {
  const {
    title = "",
    content = "",
    level = "body",
  } = block.props as {
    title?: string;
    content?: string;
    level?: string;
  };

  return (
    <div className="wb-block-text">
      {title && (
        <h3 className={`wb-block-text__title ${TEXT_LEVEL_CLASSES[level] ?? ""}`}>{title}</h3>
      )}
      {content && <div className="wb-block-text__content wb-text-secondary">{content}</div>}
    </div>
  );
}
