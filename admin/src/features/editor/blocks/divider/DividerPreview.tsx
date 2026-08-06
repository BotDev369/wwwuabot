import type { InternalDividerBlock } from "./DividerEditor";

interface Props {
  block: InternalDividerBlock;
}

export function DividerPreview(_props: Props) {
  return <hr className="tg-divider" />;
}