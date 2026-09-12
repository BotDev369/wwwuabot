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
      align: e("Вирівнювання", ["left", "center", "right"], { default: "left" }),
    },
    required: ["content"],
    defaultProps: { title: "", content: "", level: "body", align: "left" },
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
      width: e("Ширина", ["full", "3/4", "1/2", "1/3", "auto"], { default: "full" }),
      rounded: b("Заокруглені кути"),
    },
    required: ["src"],
    defaultProps: { src: "", alt: "", caption: "", width: "full", rounded: false },
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
      columns: e("Кількість стовпців", ["2", "3", "4"], { default: "2" }),
      rounded: b("Заокруглені кути", { default: true }),
      gap: e("Відстань між елементами", ["sm", "md", "lg"], { default: "md" }),
    },
    required: ["images"],
    defaultProps: { images: [], columns: "2", rounded: true, gap: "md" },
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
      style: e("Стиль", ["border-left", "border-right", "filled", "outlined"], {
        default: "border-left",
      }),
    },
    required: ["text"],
    defaultProps: { text: "", author: "", role: "", style: "border-left" },
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
    icon: "tag",
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
