/**
 * @wwwuabot/shared/files — примітиви файлу, які не знають домену.
 *
 * Живуть окремо від `shop` і `messages`: правило «який файл прийняти й як його
 * назвати» одне, а доменні різниці лишаються в тих модулях.
 *
 * @module @wwwuabot/shared/files
 */

export {
  MEDIA_IMAGE_LABELS,
  MEDIA_IMAGE_TYPES,
  MEDIA_MAX_BYTES,
  formatBytes,
  imageTypesLabel,
  isImageMime,
  isSafeMediaKey,
  mediaKeyFor,
  mediaRandomToken,
  safeMediaName,
  validateImageUpload,
} from "./media";
export type { ImageUploadCheck } from "./media";
