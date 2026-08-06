import { blockRegistry } from "../registry";
import { DividerEditor, type InternalDividerBlock } from "./DividerEditor";
import { DividerPreview } from "./DividerPreview";
import * as utils from "./divider.utils";

export const dividerConfig = {
  type: "divider",
  tgType: "divider",
  label: "Розділювач",
  icon: "—",
  createDefault: (id: string): InternalDividerBlock => ({
    id,
    type: "divider",
  }),
  Editor: DividerEditor as any,
  Preview: DividerPreview as any,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

blockRegistry.register(dividerConfig);