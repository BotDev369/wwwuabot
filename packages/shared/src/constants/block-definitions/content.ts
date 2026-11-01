/**
 * CONTENT — базові блоки контенту (текст, зображення, richtext, відео, галерея, цитата, код, бейджі).
 */

import type { BlockDefinition } from "../../types/page-config";
import { block, s, b, e, oa } from "./helpers";

export const contentBlocks: BlockDefinition[] = [
  block({
    type: "text",
    label: "Текст",
    icon: "text",
    category: "content",
    description: "Блок з заголовком та/або текстовим вмістом",
    props: {
      title: s("Заголовок"),
      content: s("Текст"),
      level: e("Рівень заголовка", ["h1", "h2", "h3", "h4", "body"], { default: "body" }),
    },
    required: ["content"],
    defaultProps: { title: "", content: "", level: "body" },
  }),
  block({
    type: "image",
    label: "Зображення",
    icon: "image",
    category: "content",
    description: "Фото або графіка з підписом",
    props: {
      src: s("URL зображення", { format: "uri" }),
      alt: s("Альтернативний текст"),
      caption: s("Підпис"),
    },
    required: ["src"],
    defaultProps: { src: "", alt: "", caption: "" },
  }),
  block({
    type: "richtext",
    label: "Rich Text",
    icon: "edit",
    category: "content",
    description: "Текст з форматуванням: жирний, курсив, посилання, код",
    compatibleZones: ["main", "sidebar"],
    props: { html: s("HTML-вміст") },
    required: ["html"],
    defaultProps: { html: "" },
  }),
  block({
    type: "video",
    label: "Відео",
    icon: "video",
    category: "content",
    description: "Відео-плеєр (YouTube, Vimeo або прямий URL)",
    props: {
      url: s("URL відео"),
      title: s("Заголовок"),
      caption: s("Підпис"),
      autoplay: b("Автозапуск"),
      loop: b("Зациклення"),
    },
    required: ["url"],
    defaultProps: { url: "", title: "", caption: "", autoplay: false, loop: false },
  }),
  block({
    type: "gallery",
    label: "Галерея",
    icon: "grid",
    category: "content",
    description: "Сітка зображень з можливістю перегляду",
    props: {
      images: oa(
        "Зображення",
        { src: s("URL", { format: "uri" }), alt: s("Альтернативний текст"), caption: s("Підпис") },
        ["src"],
      ),
    },
    required: ["images"],
    defaultProps: { images: [] },
  }),
  block({
    type: "quote",
    label: "Цитата",
    icon: "quote",
    category: "content",
    description: "Блок-цитата з атрибуцією",
    compatibleZones: ["main", "sidebar"],
    props: {
      text: s("Текст цитати"),
      author: s("Автор"),
      role: s("Посада / опис автора"),
    },
    required: ["text"],
    defaultProps: { text: "", author: "", role: "" },
  }),
  block({
    type: "code",
    label: "Код",
    icon: "code",
    category: "content",
    description: "Блок коду з підсвіткою синтаксису",
    compatibleZones: ["main", "sidebar"],
    props: {
      code: s("Код"),
      language: e(
        "Мова",
        ["javascript", "typescript", "python", "html", "css", "json", "bash", "sql", "plain"],
        { default: "plain" },
      ),
      title: s("Заголовок"),
      showLineNumbers: b("Показувати номери рядків"),
      copyable: b("Кнопка копіювання", { default: true }),
    },
    required: ["code"],
    defaultProps: {
      code: "",
      language: "plain",
      title: "",
      showLineNumbers: false,
      copyable: true,
    },
  }),
  block({
    type: "badge",
    label: "Бейдж",
    icon: "badge",
    category: "content",
    description: "Смуга бейджів/міток для статусів та тегів",
    compatibleZones: ["main", "header", "sidebar"],
    props: {
      items: oa(
        "Бейджі",
        {
          text: s("Текст"),
          variant: e("Стиль", ["accent", "green", "red", "yellow", "neutral"], {
            default: "accent",
          }),
        },
        ["text"],
      ),
      layout: e("Розташування", ["row", "wrap"], { default: "wrap" }),
    },
    required: ["items"],
    defaultProps: { items: [], layout: "wrap" },
  }),
];
