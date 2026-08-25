import { blockRegistry } from "../registry";
import { HeadingEditor, type InternalHeadingBlock } from "./HeadingEditor";
import { HeadingPreview } from "./HeadingPreview";
import * as utils from "./heading.utils";

export const headingConfig = {
  type: "heading",           // Внутрішній тип для UI
  tgType: "heading",         // Тип для Telegram API
  label: "Заголовок",
  icon: "H",
  createDefault: (id: string): InternalHeadingBlock => ({
    id,
    type: "heading",
    text: "",
    level: "h2",
  }),
  Editor: HeadingEditor as any, 
  Preview: HeadingPreview as any,
  toTelegram: utils.toTelegram,
  fromTelegram: utils.fromTelegram,
};

// Автоматична реєстрація при імпорті цього файлу
blockRegistry.register(headingConfig);