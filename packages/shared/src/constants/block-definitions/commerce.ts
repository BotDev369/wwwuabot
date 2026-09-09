/**
 * COMMERCE — комерційні блоки (ціни, відгуки, фічі, FAQ).
 */

import type { BlockDefinition } from '../../types/page-config';
import { block, s, n, b, e, sa, oa } from './helpers';

export const commerceBlocks: BlockDefinition[] = [
  block({
    type: "pricing", label: "Ціни", icon: "tag", category: "commerce",
    description: "Картка з ціною та переліком можливостей",
    props: {
      plans: oa("Тарифні плани", {
        name: s("Назва"), price: s("Ціна"), period: s("Період", { default: "/міс" }),
        features: sa("Можливості"), highlighted: b("Виділений"), ctaText: s("Текст кнопки", { default: "Обрати" }),
      }, ["name", "price"]),
      columns: e("Кількість колонок", ["auto", "2", "3"], { default: "auto" }),
    },
    required: ["plans"],
    defaultProps: { plans: [], columns: "auto" },
  }),
  block({
    type: "testimonial", label: "Відгук", icon: "message-square", category: "commerce",
    description: "Відгук клієнта з фото та підписом",
    compatibleZones: ["main", "sidebar"],
    props: {
      text: s("Текст відгуку"), author: s("Автор"), role: s("Посада"),
      avatar: s("URL аватара", { format: "uri" }), rating: n("Рейтинг (0-5)"),
    },
    required: ["text", "author"],
    defaultProps: { text: "", author: "", role: "", avatar: "", rating: 0 },
  }),
  block({
    type: "feature-card", label: "Фіча", icon: "sparkles", category: "commerce",
    description: "Карточка з іконкою, заголовком та описом",
    props: {
      items: oa("Фічі", { icon: s("Іконка"), title: s("Заголовок"), description: s("Опис") }, ["title"]),
      columns: e("Кількість колонок", ["2", "3"], { default: "2" }),
    },
    required: ["items"],
    defaultProps: { items: [], columns: "2" },
  }),
  block({
    type: "faq", label: "FAQ", icon: "search", category: "commerce",
    description: "Часто задавані питання (акордеон)",
    compatibleZones: ["main", "sidebar"],
    props: {
      items: oa("Питання", { question: s("Питання"), answer: s("Відповідь") }, ["question", "answer"]),
      title: s("Заголовок секції", { default: "Часті питання" }),
    },
    required: ["items"],
    defaultProps: { items: [], title: "Часті питання" },
  }),
];
