import { blockRegistry } from "../registry";
import { FooterEditor, type InternalFooterBlock } from "./FooterEditor";
import { FooterPreview } from "./FooterPreview";
import * as utils from "./footer.utils";

export const footerConfig = {
  type: "footer",
  tgType: "footer",
  label: "Футер",
  icon: "⌞",
  createDefault: (id: string): InternalFooterBlock => ({ id, type: "footer", text: "" }),
  Editor: FooterEditor as any,
  Preview: FooterPreview as any,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

blockRegistry.register(footerConfig);
