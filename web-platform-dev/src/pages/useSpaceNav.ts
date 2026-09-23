/**
 * `useSpaceNav` — стан бічної панелі розділів Простору.
 *
 * **Розділ читається з адреси один раз, далі ним керує стан.** Так було й доти
 * (AGENTS.md §7): адреса — це вхід, а не стан, тож закриття вкладки не повертає
 * людину в розділ зі старого посилання.
 *
 * **Панель відкрита лише тоді, коли розділ не названо адресою**
 * (`readSpaceNavExpanded`). Дотик по «Простір» у футері веде на `/space` — і
 * панель мусить бути розгорнутою: перш ніж щось показати, треба дати **обрати**
 * (знак + підпис). А вибір розділу панель **згортає**: місце звільняється під
 * вміст, а «де я» лишається видно іконкою з акцентом. Тому вибір і згортання —
 * одна дія, а не дві: розвести їх означало б лишити стан, у якого немає входу.
 *
 * @module web-platform-dev/src/pages/useSpaceNav
 */

import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  SPACE_TAB_PARAM,
  readSpaceNavExpanded,
  readSpaceTab,
  spaceTab,
  type SpaceTab,
  type SpaceTabOption,
} from "./space-tabs";

export interface SpaceNavState {
  /** Обраний розділ — він же показується праворуч від панелі. */
  tab: SpaceTab;
  /** Опис обраного розділу: підпис, знак і те, чи він ще в розробці. */
  current: SpaceTabOption;
  /** Панель розгорнута: знак **і** підпис у кожного пункту. */
  expanded: boolean;
  /**
   * Розділ **названо адресою**, тобто його обрано ще до входу.
   *
   * Це те саме, що «панель прийшла згорнутою» (`readSpaceNavExpanded`), але тут
   * воно потрібне назві екрана: названий розділ показують своїм ім'ям («Ігри»,
   * «Сторінки»), а неназваний — ім'ям самого Простору, бо людина ще обирає.
   * Стан береться **один раз із адреси**: розгортання панели дотиком не робить
   * названий розділ неназваним.
   */
  named: boolean;
  /** Обрати розділ — і згорнути панель. */
  select: (key: SpaceTab) => void;
  /** Розгорнути або згорнути панель — без зміни розділу. */
  toggle: () => void;
}

export function useSpaceNav(): SpaceNavState {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<SpaceTab>(() => readSpaceTab(searchParams.get(SPACE_TAB_PARAM)));
  const [expanded, setExpanded] = useState<boolean>(() =>
    readSpaceNavExpanded(searchParams.get(SPACE_TAB_PARAM)),
  );
  const [named] = useState<boolean>(() => !readSpaceNavExpanded(searchParams.get(SPACE_TAB_PARAM)));

  const select = useCallback((key: SpaceTab) => {
    setTab(key);
    setExpanded(false);
  }, []);

  const toggle = useCallback(() => setExpanded((open) => !open), []);

  return { tab, current: spaceTab(tab), expanded, named, select, toggle };
}
