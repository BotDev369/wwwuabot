/**
 * ANALYTICS — аналітичні блоки (стовпчиковий, круговий, нахил, теплова карта).
 */

import type { BlockDefinition } from "../../types/page-config";
import { block, e, s, n, b, oa, sa } from "./helpers";

export const analyticsBlocks: BlockDefinition[] = [
  block({
    type: "chart",
    label: "Графік",
    icon: "bar-chart",
    category: "analytics",
    compatibleZones: ["main"],
    description: "Стовпчики, сектори, нахил «було → стало» або теплова карта",
    props: {
      type: e("Тип графіка", ["bar", "pie", "slope", "heatmap"], { default: "bar" }),
      data: oa(
        "Дані",
        {
          label: s("Мітка"),
          value: n("Значення"),
          from: n("Було"),
          to: n("Стало"),
          color: s("Колір (hex)"),
        },
        ["label"],
      ),
      rows: oa("Рядки теплової карти", {
        label: s("Мітка"),
        cells: { type: "array", title: "Значення по колонках", items: { type: "number" } },
      }),
      columns: sa("Колонки теплової карти"),
      fromLabel: s("Підпис «було»"),
      toLabel: s("Підпис «стало»"),
      unit: s("Одиниця (%, хв)"),
      title: s("Заголовок"),
      showLabels: b("Показувати мітки значень", { default: true }),
    },
    required: ["type"],
    defaultProps: { type: "bar", data: [], title: "", showLabels: true },
  }),
];
