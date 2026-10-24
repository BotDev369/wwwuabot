/**
 * Місток журналу: сторінка, поверхня й дія в одному місці. Стоїть
 * **усередині** `ScreenChromeProvider` (назву сторінки знає він), а окремим
 * компонентом — щоб каркас лишався розміткою, а не місцем, де вирішують, що
 * писати в журнал.
 *
 * @module web-platform-dev/src/layout/JournalBridge
 */

import type { ReactElement } from "react";
import { useActionLog } from "./useActionLog";
import { useModalLog } from "./useModalLog";
import { usePlatformViews } from "./usePlatformViews";

export function JournalBridge(): ReactElement | null {
  usePlatformViews();
  useModalLog();
  useActionLog();
  return null;
}
