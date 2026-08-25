import { blockRegistry } from "../registry";
import { ParagraphEditor, type InternalParagraphBlock } from "./ParagraphEditor";
import { ParagraphPreview } from "./ParagraphPreview";
import * as utils from "./paragraph.utils";

export const paragraphConfig = {
  type: "paragraph",
  tgType: "paragraph",
  label: "Параграф",
  icon: "¶",
  createDefault: (id: string): InternalParagraphBlock => ({
    id,
    type: "paragraph",
    text: "",
  }),
  Editor: ParagraphEditor as any,
  Preview: ParagraphPreview as any,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

blockRegistry.register(paragraphConfig);