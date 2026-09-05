import type { ComponentType } from "react";

export interface BaseBlock {
  id: string;
  type: string;
}

export type BlockEditorComponent<T extends BaseBlock = BaseBlock> = ComponentType<{
  block: T;
  idx: number;
  total: number;
}>;

export type BlockPreviewComponent<T extends BaseBlock = BaseBlock> = ComponentType<{
  block: T;
}>;

export interface BlockConfig<TInternal extends BaseBlock = BaseBlock, TTelegram = unknown> {
  type: string;
  tgType: string;
  label: string;
  icon: string;
  hidden?: boolean;
  createDefault: (id: string) => TInternal;
  Editor: BlockEditorComponent<TInternal>;
  Preview: BlockPreviewComponent<TInternal>;
  toTelegram: (block: TInternal) => TTelegram;
  fromTelegram: (tgBlock: TTelegram, index: number) => TInternal;
}
