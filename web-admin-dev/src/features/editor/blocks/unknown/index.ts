import { blockRegistry } from "../registry";
import { UnknownEditor, type InternalUnknownBlock } from "./UnknownEditor";
import { UnknownPreview } from "./UnknownPreview";
import * as utils from "./unknown.utils";

export const unknownConfig = {
  type: "unknown",
  tgType: "__unknown__", // ніколи не матчить реальний TG-тип; пошук лише через internalMap
  label: "Невідомий блок",
  icon: "?",
  hidden: true,
  createDefault: (id: string): InternalUnknownBlock => ({
    id,
    type: "unknown",
    tgType: "unknown",
    raw: { type: "unknown" },
  }),
  Editor: UnknownEditor,
  Preview: UnknownPreview,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

blockRegistry.register(unknownConfig);
