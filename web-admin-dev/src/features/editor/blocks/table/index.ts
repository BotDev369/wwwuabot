import { blockRegistry } from "../registry";
import { TableEditor, type InternalTableBlock } from "./TableEditor";
import { TablePreview } from "./TablePreview";
import * as utils from "./table.utils";

export const tableConfig = {
  type: "table",
  tgType: "table",
  label: "Таблиця",
  icon: "T",
  createDefault: (id: string): InternalTableBlock => ({
    id,
    type: "table",
    rows: [
      [
        { text: "", isHeader: true, align: "left", valign: "middle" },
        { text: "", isHeader: true, align: "left", valign: "middle" },
      ],
    ],
    isBordered: true,
    isStriped: false,
  }),
  Editor: TableEditor,
  Preview: TablePreview,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

blockRegistry.register(tableConfig);
