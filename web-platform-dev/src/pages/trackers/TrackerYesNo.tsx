/**
 * Запис «так-ні»: дві вкладки — той самий кирпичик, що й решта смуг вибору,
 * бо «так чи ні» — це теж «два статуси одного питання». Клавіші — **«1» / «0»**,
 * а не слово: це те саме значення, яке йде на сервер, і саме його чекає
 * `submit` обох форм — ключі обирає цей кирпичик, а не два місця окремо.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerYesNo
 */

import type { ReactElement } from "react";
import { Tabs, type TabOption } from "@wwwuabot/ui/tabs";

const YES_NO_TABS: readonly TabOption[] = [
  { key: "1", label: "Так" },
  { key: "0", label: "Ні" },
];

interface TrackerYesNoProps {
  /** Обраний статус: «1» / «0»; порожній рядок — людина ще не обрала. */
  value: string;
  onChange: (value: string) => void;
  /** Назва смуги для читача з екрана. */
  label: string;
}

export function TrackerYesNo({ value, onChange, label }: TrackerYesNoProps): ReactElement {
  return <Tabs options={YES_NO_TABS} value={value} onChange={onChange} label={label} />;
}
