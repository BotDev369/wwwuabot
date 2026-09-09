/**
 * ANALYTICS — аналітичні блоки (стовпчиковий, круговий графіки).
 */

import type { BlockDefinition } from '../../types/page-config';
import { block, e, s, n, b, oa } from './helpers';

export const analyticsBlocks: BlockDefinition[] = [
  block({
    type: "chart", label: "Графік", icon: "bar-chart", category: "analytics",
    compatibleZones: ["main"],
    description: "Простий стовпчиковий або круговий графік",
    props: {
      type: e("Тип графіка", ["bar", "pie"], { default: "bar" }),
      data: oa("Дані", { label: s("Мітка"), value: n("Значення"), color: s("Колір (hex)") }, ["label", "value"]),
      title: s("Заголовок"),
      showLabels: b("Показувати мітки значень", { default: true }),
    },
    required: ["data"],
    defaultProps: { type: "bar", data: [], title: "", showLabels: true },
  }),
];
