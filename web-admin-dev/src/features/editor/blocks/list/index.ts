import { blockRegistry } from "../registry";
import { ListEditor, type InternalListBlock } from "./ListEditor";
import { ListPreview } from "./ListPreview";
import * as utils from "./list.utils";

export const listConfig = {
  type: "list",
  tgType: "list",
  label: "Список",
  icon: "•",
  createDefault: (id: string): InternalListBlock => ({
    id,
    type: "list",
    style: "bullet",
    items: [{ id: `${id}_li0`, kind: "simple", text: "" }],
  }),
  Editor: ListEditor,
  Preview: ListPreview,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

blockRegistry.register(listConfig);
