import type { BaseBlock } from "./types";
import { blockRegistry } from "./registry";

// Спільний рендер масиву внутрішніх блоків у Telegram-стилі.
// Використовується і в редакторі (TgPreview), і на екрані перегляду сценарію.
export function RichBlocksView({ blocks }: { blocks: BaseBlock[] }) {
  return (
    <>
      {blocks.map((block) => {
        const config = blockRegistry.getByInternalType(block.type);
        if (!config) return null;
        const PreviewComponent = config.Preview;
        return <PreviewComponent key={block.id} block={block as never} />;
      })}
    </>
  );
}
