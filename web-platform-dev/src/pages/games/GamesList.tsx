/**
 * «Ігри» — у що тут можна пограти.
 *
 * **Список, а не дошка.** Екран відповідає на питання «що тут є», партія йде на
 * своєму екрані зі своєю адресою: інакше «назад» зі середини партії виводило б
 * зі списку, а посилання на гру не існувало б.
 *
 * **Смуга керування стоїть другим рядком** — як у кожному списку продукту:
 * перший рядок — назва екрана, другий — те, чим список керують, далі — сам
 * список. Тут це пошук за назвою.
 *
 * **Розмітка — спільна** (`MenuList` з `@wwwuabot/ui/menu`): це той самий
 * «список пунктів у потоці сторінки», яким показують й інші переліки продукту.
 * Друга копія мірок під те саме тут була б зайвою.
 *
 * **Знака гри в рядку немає** (правило 23): рядок списку — вміст, а вміст
 * знаків не носить — назва гри й так її називає, а знак перед нею був би третім
 * підписом того самого.
 *
 * **Шеврон — бо гра веде далі** (`trailing`): рядок, за яким стоїть екран,
 * замикається знаком напрямку, а той, що діє на місці, — ні.
 *
 * **Один рядок під списком — про те, чого в списку не видно.** Усі ігри поки
 * що на одного, а де є суперник — він бот: про це мусить бути сказано, бо
 * інакше людина чекає «запросити гравця», якого ще немає. Під списком, а не
 * над ним: другий рядок екрана належить смузі керування, і примітка перед
 * нею зсунула б список на рядок відносно решти розділів.
 *
 * @module web-platform-dev/src/pages/games/GamesList
 */

import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { MenuList, type MenuItem } from "@wwwuabot/ui/menu";
import { ListEmpty } from "../ListEmpty";
import { ListToolbar } from "../ListToolbar";
import { DEFAULT_LIST_VIEW, filterByQuery, type ListView } from "../list-view";
import { GAMES, gamePath } from "./games";

export function GamesList(): ReactElement {
  const navigate = useNavigate();
  const [view, setView] = useState<ListView>(DEFAULT_LIST_VIEW);

  // Шукаємо за тим, що видно в рядку: у пункту гри є рівно назва.
  const visible = filterByQuery(GAMES, view.query, (game) => [game.label]);
  const change = (patch: Partial<ListView>): void => setView((prev) => ({ ...prev, ...patch }));

  const items: MenuItem[] = visible.map((game) => ({
    key: game.key,
    label: game.label,
    trailing: true,
    onSelect: () => navigate(gamePath(game.key)),
  }));

  return (
    <>
      <ListToolbar
        view={view}
        onChange={change}
        searchLabel="Пошук за назвою гри"
        shown={visible.length}
        total={GAMES.length}
      />

      {visible.length === 0 ? (
        <ListEmpty onReset={() => change(DEFAULT_LIST_VIEW)} />
      ) : (
        <>
          <MenuList items={items} />
          <p className="wb-text-muted">Усі ігри поки що на одного. Де є суперник — він бот.</p>
        </>
      )}
    </>
  );
}
