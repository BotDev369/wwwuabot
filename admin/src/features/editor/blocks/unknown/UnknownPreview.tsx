import type { InternalUnknownBlock } from "./UnknownEditor";

interface Props {
  block: InternalUnknownBlock;
}

export function UnknownPreview({ block }: Props) {
  return <div className="tg-unknown">[Блок «{block.tgType}» у повідомленні]</div>;
}