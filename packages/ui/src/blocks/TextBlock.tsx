/**
 * Page Builder — Text Block.
 *
 * Displays a title and/or text content with configurable heading level and alignment.
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
 * Розміри — зі шкали токенів, а не власні: `--text-2xl` у кожного бренду свій
 * (Apple і Android переписують шкалу цілком), тож сторінка з шаблону виглядає
 * доречно в кожній темі, а не тільки в типовій.
 */
export const TEXT_LEVEL_CLASSES: Record<string, string> = {
  h1: "wb-text-2xl wb-font-bold",
  h2: "wb-text-xl wb-font-bold",
  h3: "wb-text-lg wb-font-semibold",
  h4: "wb-text-md wb-font-semibold",
  body: "wb-text-base",
};

const ALIGN_CLASSES: Record<string, string> = {
  left: "wb-text-left",
  center: "wb-text-center",
  right: "wb-text-right",
};

export function TextBlock({ block }: BlockComponentProps) {
  const {
    title = "",
    content = "",
    level = "body",
    align = "left",
  } = block.props as {
    title?: string;
    content?: string;
    level?: string;
    align?: string;
  };

  return (
    <div className={`wb-block-text ${ALIGN_CLASSES[align] ?? ""}`}>
      {title && (
        <h3 className={`wb-block-text__title ${TEXT_LEVEL_CLASSES[level] ?? ""} wb-mb-2`}>
          {title}
        </h3>
      )}
      {content && (
        <div
          className="wb-block-text__content wb-text-secondary"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
