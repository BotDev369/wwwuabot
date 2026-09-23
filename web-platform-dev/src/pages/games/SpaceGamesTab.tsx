/**
 * «Ігри» — вкладка Простору: у що тут можна пограти.
 *
 * **Список, а не дошка.** Вкладка відповідає на питання «що тут є», партія
 * йде на своєму екрані зі своєю адресою: інакше «назад» зі середини партії
 * виводило б із Простору, а посилання на гру не існувало б.
 *
 * **Розмітка — спільна** (`MenuList` з `@wwwuabot/ui/menu`): це той самий
 * «список пунктів у потоці сторінки», яким хабу профілю показують його
 * розділи. Друга копія мірок під те саме тут була б зайвою.
 *
 * **Шеврон — бо гра веде далі** (`trailing`): у Просторі рядок, за яким стоїть
 * екран, замикається знаком напрямку, а той, що діє на місці (оголошення,
 * тема), — ні. Це одне правило на всі списки розділу, а не смак кожного.
 *
 * **Один рядок над списком — про те, чого в списку не видно.** Усі ігри поки
 * що на одного, а де є суперник — він бот: про це мусить бути сказано, бо
 * інакше людина чекає «запросити гравця», якого ще немає.
 *
 * @module web-platform-dev/src/pages/games/SpaceGamesTab
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { MenuList, type MenuItem } from "@wwwuabot/ui/menu";
import { GAMES, gamePath } from "./games";

export function SpaceGamesTab(): ReactElement {
  const navigate = useNavigate();

  const items: MenuItem[] = GAMES.map((game) => ({
    key: game.key,
    label: game.label,
    icon: game.icon,
    trailing: true,
    onSelect: () => navigate(gamePath(game.key)),
  }));

  return (
    <>
      <p className="wb-text-muted">Усі ігри поки що на одного. Де є суперник — він бот.</p>
      <MenuList items={items} />
    </>
  );
}
