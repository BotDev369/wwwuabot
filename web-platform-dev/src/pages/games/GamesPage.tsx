/**
 * «Ігри» — у що тут можна пограти.
 *
 * **Список, а партія — окремий екран.** Екран відповідає на питання «що тут є»,
 * а гра йде на своїй адресі (`/games/:key`) зі своїм станом: інакше «назад» зі
 * середини партії виводило б зі списку, а посилання на гру не існувало б.
 *
 * @module web-platform-dev/src/pages/games/GamesPage
 */

import type { ReactElement } from "react";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { GamesList } from "./GamesList";

export function GamesPage(): ReactElement {
  useScreenChrome({ title: "Ігри" });
  return (
    <div className="wb-page">
      <GamesList />
    </div>
  );
}
