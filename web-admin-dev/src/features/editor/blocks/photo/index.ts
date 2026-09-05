import { blockRegistry } from "../registry";
import { PhotoEditor, type InternalPhotoBlock } from "./PhotoEditor";
import { PhotoPreview } from "./PhotoPreview";
import * as utils from "./photo.utils";

export const photoConfig = {
  type: "photo",
  tgType: "photo",
  label: "Фото",
  icon: "🖼",
  createDefault: (id: string): InternalPhotoBlock => ({
    id,
    type: "photo",
    media: "",
    config: null,
  }),
  Editor: PhotoEditor,
  Preview: PhotoPreview,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

blockRegistry.register(photoConfig);
