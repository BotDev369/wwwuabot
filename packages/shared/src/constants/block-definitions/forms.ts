/**
 * FORMS — форми та введення (інпути, текстові поля, вибір зі списку).
 */

import type { BlockDefinition } from '../../types/page-config';
import { block, s, n, b, e, oa } from './helpers';

export const formsBlocks: BlockDefinition[] = [
  block({
    type: "input", label: "Інпут", icon: "edit", category: "forms",
    description: "Поле введення тексту",
    props: {
      label: s("Мітка"), placeholder: s("Placeholder"),
      type: e("Тип", ["text", "email", "number", "phone", "password", "url"], { default: "text" }),
      required: b("Обов'язкове"), name: s("Ім'я поля"),
    },
    defaultProps: { label: "", placeholder: "", type: "text", required: false, name: "" },
  }),
  block({
    type: "textarea", label: "Текстове поле", icon: "edit", category: "forms",
    description: "Поле введення багаторядкового тексту",
    props: {
      label: s("Мітка"), placeholder: s("Placeholder"),
      rows: n("Кількість рядків", { default: 4 }),
      required: b("Обов'язкове"), name: s("Ім'я поля"),
    },
    defaultProps: { label: "", placeholder: "", rows: 4, required: false, name: "" },
  }),
  block({
    type: "select", label: "Вибір", icon: "filter", category: "forms",
    description: "Список вибору з декількома опціями",
    props: {
      label: s("Мітка"),
      options: oa("Опції", { value: s("Значення"), label: s("Відображення") }, ["value", "label"]),
      placeholder: s("Placeholder"), required: b("Обов'язкове"), name: s("Ім'я поля"),
    },
    required: ["options"],
    defaultProps: { label: "", options: [], placeholder: "Оберіть...", required: false, name: "" },
  }),
];
