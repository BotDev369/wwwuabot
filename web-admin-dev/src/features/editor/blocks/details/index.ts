import { blockRegistry } from "../registry";
import { DetailsEditor, type InternalDetailsBlock } from "./DetailsEditor";
import { DetailsPreview } from "./DetailsPreview";
import * as utils from "./details.utils";

export const detailsConfig = {
  type: "details",
  tgType: "details",
  label: "Details",
  icon: "▸",
  createDefault: (id: string): InternalDetailsBlock => ({
    id,
    type: "details",
    summary: "",
    isOpen: false,
    children: [],
  }),
  Editor: DetailsEditor,
  Preview: DetailsPreview,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

blockRegistry.register(detailsConfig);
