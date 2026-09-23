/**
 * «Ігри» — вкладка Простору: у що тут можна пограти.
 *
 * **Список, а не дошка.** Вкладка відповідає на питання «що тут є», партія
 * йде на своєму екрані зі своєю адресою: інакше «назад» зі середини партії
 * виводило б із Простору, а посилання на гру не існувало б.
 *
 * **Смуга керування стоїть другим рядком** — як у кожному розділі Простору:
 * перший рядок — знак панелі й назва розділу, другий — те, чим список
 * керують, далі — сам список. Тут це пошук за назвою.
 *
 * **Розмітка — спільна** (`MenuList` з `@wwwuabot/ui/menu`): це той самий
 * «список пунктів у потоці сторінки», яким хабу профілю показують його
 * розділи. Друга копія мірок під те саме тут була б зайвою.
 *
 * **Шеврон — бо гра веде далі** (`trailing`): у Просторі рядок, за яким стоїть
 * екран, замикається знаком напрямку, а той, що діє на місці (оголошення,
 * тема), — ні. Це одне правило на всі списки розділу, а не смак кожного.
 *
 * **Один рядок під списком — про те, чого в списку не видно.** Усі ігри поки
 * що на одного, а де є суперник — він бот: про це мусить бути сказано, бо
 * інакше людина чекає «запросити гравця», якого ще немає. Під списком, а не
 * над ним: другий рядок екрана належить смузі керування, і примітка перед
 * нею зсунула б список на рядок відносно решти розділів.
 *
 * @module web-platform-dev/src/pages/games/SpaceGamesTab
 */

import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { MenuList, type MenuItem } from "@wwwuabot/ui/menu";
import { SpaceListEmpty } from "../SpaceListEmpty";
import { SpaceListToolbar } from "../SpaceListToolbar";
import { DEFAULT_SPACE_LIST_VIEW, filterByQuery, type SpaceListView } from "../space-list-view";
import { GAMES, gamePath } from "./games";

export function SpaceGamesTab(): ReactElement {
  const navigate = useNavigate();
  const [view, setView] = useState<SpaceListView>(DEFAULT_SPACE_LIST_VIEW);

  // Шукаємо за тим, що видно в рядку: у пункту гри є рівно назва.
  const visible = filterByQuery(GAMES, view.query, (game) => [game.label]);
  const change = (patch: Partial<SpaceListView>): void =>
    setView((prev) => ({ ...prev, ...patch }));

  const items: MenuItem[] = visible.map((game) => ({
    key: game.key,
    label: game.label,
    icon: game.icon,
    trailing: true,
    onSelect: () => navigate(gamePath(game.key)),
  }));

  return (
    <>
      <SpaceListToolbar
        view={view}
        onChange={change}
        searchLabel="Пошук за назвою гри"
        shown={visible.length}
        total={GAMES.length}
      />

      {visible.length === 0 ? (
        <SpaceListEmpty onReset={() => change(DEFAULT_SPACE_LIST_VIEW)} />
      ) : (
        <>
          <MenuList items={items} />
          <p className="wb-text-muted">Усі ігри поки що на одного. Де є суперник — він бот.</p>
        </>
      )}
    </>
  );
}
