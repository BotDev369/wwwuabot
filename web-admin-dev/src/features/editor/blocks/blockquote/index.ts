import { blockRegistry } from "../registry";
import { BlockquoteEditor, type InternalBlockquoteBlock } from "./BlockquoteEditor";
import { BlockquotePreview } from "./BlockquotePreview";
import * as utils from "./blockquote.utils";

export const blockquoteConfig = {
  type: "blockquote",
  tgType: "blockquote",
  label: "Цитата",
  icon: "❝",
  createDefault: (id: string): InternalBlockquoteBlock => ({
    id,
    type: "blockquote",
    children: [],
  }),
  Editor: BlockquoteEditor,
  Preview: BlockquotePreview,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

blockRegistry.register(blockquoteConfig);
