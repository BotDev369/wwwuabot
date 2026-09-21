/**
 * Розділи теми — склад, порядок і адреси.
 *
 * **Дані, а не розмітка.** Одним списком користуються двоє: хаб (`/profile/theme`,
 * список рядків) і друга смуга футера (швидкий перехід між розділами). Дві копії
 * розійшлися б на першій же правці — і кнопка вела б у розділ, якого немає.
 *
 * **Порядок — від загального до власного.** Спершу те, що людина **бачить**
 * (стиль і готові теми), далі своя бібліотека, далі спільна, і в кінці те, де
 * вона творить сама. Смуга футера показує чотири з п'яти (без «готових тем»):
 * у неї потрапляє те, що міняють **часто**, а готові трійки стоять поруч зі
 * своїми — у списку.
 *
 * @module web-platform-dev/src/pages/themes/theme-sections
 */

import type { IconName } from "@wwwuabot/shared";
// Відносний імпорт, а не аліас `@/`: цей модуль читає тест, а тести ганяються
// з кореневого конфіга без аліасів (`vitest.config.ts`).
import { THEME_PATH } from "../../app/routes";

export type ThemeSection = "style" | "presets" | "mine" | "public" | "customize";

export interface ThemeSectionOption {
  key: ThemeSection;
  label: string;
  /** Одним рядком: що людина знайде в розділі. Показує хаб, не смуга. */
  hint: string;
  icon: IconName;
  /** Розділ дублюється в другій смузі футера — як швидкий перехід. */
  quick: boolean;
}

export const THEME_SECTIONS: readonly ThemeSectionOption[] = [
  {
    key: "style",
    label: "Стиль",
    hint: "Характер продукту: Apple чи Material",
    icon: "sliders",
    quick: true,
  },
  {
    key: "presets",
    label: "Готові теми",
    hint: "Перевірені трійки кольорів — одним дотиком",
    icon: "sparkles",
    quick: false,
  },
  {
    key: "mine",
    label: "Мої схеми",
    hint: "Те, що ви створили й можете змінити",
    icon: "star",
    quick: true,
  },
  {
    key: "public",
    label: "Публічні схеми",
    hint: "Схеми, якими поділилися інші люди",
    icon: "globe",
    quick: true,
  },
  {
    key: "customize",
    label: "Налаштувати",
    hint: "Три кольори, шрифт — і зберегти як схему",
    icon: "edit",
    quick: true,
  },
];

/** Адреса розділу — одна на маршрут, пункт смуги й рядок хабу. */
export function themeSectionPath(key: ThemeSection): string {
  return `${THEME_PATH}/${key}`;
}

/** Ті розділи, що стоять у другій смузі футера, — у тому ж порядку. */
export const THEME_QUICK_SECTIONS: readonly ThemeSectionOption[] = THEME_SECTIONS.filter(
  (section) => section.quick,
);
