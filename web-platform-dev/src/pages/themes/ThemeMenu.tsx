/**
 * `ThemeMenu` — вибір вигляду: меню з хедера, а не сторінка.
 *
 * **Тема — це вибір, а не розділ.** Людина приходить за настроєм і йде з того,
 * що бачить; адреси й «назад» тут не потрібно. Тому меню відкривається
 * палітрою в хедері, а вміст — спільна галерея тем (`ThemeColorPanel`).
 *
 * **Редактора більше немає.** Тему не збирають із трьох кольорів і не діляться
 * нею: теми малює дизайн-система, і саме тому кожна з них тримає контраст і
 * характер. Зникли й вкладки джерел — джерело одне.
 *
 * @module web-platform-dev/src/pages/themes/ThemeMenu
 */

import type { ReactElement } from "react";
import { ThemeColorPanel } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";

export interface ThemeMenuProps {
  onClose: () => void;
}

export function ThemeMenu({ onClose }: ThemeMenuProps): ReactElement {
  return <MenuModal title="Тема" onClose={onClose} content={<ThemeColorPanel />} />;
}
