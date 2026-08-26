import type { InternalPhotoBlock } from "./PhotoEditor";

interface TgPhotoBlock {
  type: "photo";
  photo: unknown;
  caption?: unknown;
  has_spoiler?: boolean;
}

export function toTelegram(block: InternalPhotoBlock): TgPhotoBlock {
  const out: TgPhotoBlock = { type: "photo", photo: { type: "photo", media: block.media } };
  if (block.caption !== undefined) out.caption = block.caption;
  if (block.hasSpoiler) out.has_spoiler = true;
  return out;
}

export function fromTelegram(tg: TgPhotoBlock, index: number): InternalPhotoBlock {
  const media =
    typeof tg.photo === "string"
      ? tg.photo
      : tg.photo && typeof tg.photo === "object" && "media" in (tg.photo as any)
        ? String((tg.photo as any).media)
        : "";
  return {
    id: `block_${Date.now()}_${index}`,
    type: "photo",
    media,
    config: null,
    caption: tg.caption,
    hasSpoiler: tg.has_spoiler === true,
  };
}
