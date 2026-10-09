/**
 * Стан секції-акордеона: розгорнута вона чи ні.
 *
 * Типово **згорнута** — як і `useExpansion` для рядків списку: екран мусить
 * уміщатися без прокрутки, а назва блока каже, що всередині. Відкрите тіло
 * під кожною назвою робить із сторінки полотно.
 * @module packages/ui/src/blocks/collapsible-section/useCollapse
 */

import { useCallback, useState } from "react";

export interface UseCollapseReturn {
  open: boolean;
  toggle: () => void;
}

export function useCollapse(): UseCollapseReturn {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((value) => !value), []);

  return { open, toggle };
}
