/**
 * `AppBar` — глобальний хедер застосунку.
 *
 * **Один хедер на всі екрани.** Він стоїть у каркасі (`PlatformShell`) і
 * закріплений завжди, тож назва екрана та три дії лишаються на місці, коли
 * вміст скролиться. Що саме показувати — вирішує екран (`useScreenChrome`), а
 * малює це один кирпичик.
 *
 * **Ліворуч — меню й назва, праворуч — самі знаки.** Знак без підпису читається
 * тут, бо кожен з них сказав би одне слово («Поділитись», «В обране», «Тема»), а
 * три слова у 44-кнопковому рядку з'їли б назву сторінки на телефоні. Підпис
 * лишається в `aria-label` і `title`.
 *
 * **Тема прибирається в профілі.** Там вона вже відкрита й лежить у своєму
 * розділі, тож друга кнопка на тому самому екрані — це «те ж саме двома
 * способами» (правило 12).
 *
 * @module packages/ui/src/nav/AppBar
 */

import { useContext, useState, type ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import type { FavoriteTarget } from "@wwwuabot/shared/favorites";
import { ThemeSheet } from "@wwwuabot/shared/components/theme";
import { ScreenChromeContext, type ScreenChrome } from "./screen-chrome";
import { useCopyLink } from "./useCopyLink";
import { useFavorite } from "../favorites/useFavorite";

export function AppBar(): ReactElement | null {
  const chrome = useContext(ScreenChromeContext)?.chrome;
  if (!chrome) return null;
  return <AppBarView chrome={chrome} />;
}

/**
 * Сама розмітка хедера — окремо від контексту, щоб її можна було перевірити
 * тестом без рендеру оболонки: що показується, а що прибирається.
 */
export function AppBarView({ chrome }: { chrome: ScreenChrome }): ReactElement {
  const { title, menu, shareUrl, favorite, theme } = chrome;

  return (
    <header className="wb-appbar">
      <div className="wb-appbar__lead">
        {menu && <BarButton icon="menu" label="Меню сторінки" onClick={menu} />}
        <h1 className="wb-appbar__title">{title}</h1>
      </div>

      <div className="wb-appbar__actions">
        {shareUrl && <ShareAction url={shareUrl} />}
        {favorite && <FavoriteAction target={favorite} />}
        {theme && <ThemeAction />}
      </div>
    </header>
  );
}

/** Кнопка-знак: мінімум 44×44, підпис лише для скриньок і довідки. */
function BarButton({
  icon,
  label,
  onClick,
  on = false,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  on?: boolean;
  disabled?: boolean;
}): ReactElement {
  return (
    <button
      type="button"
      className={`wb-appbar__btn${on ? " wb-appbar__btn--on" : ""}`}
      aria-label={label}
      title={label}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

/** «Поділитись» — копіювання адреси; після вдачі знак стає галочкою. */
function ShareAction({ url }: { url: string }): ReactElement {
  const { copied, copy } = useCopyLink(url);
  return <BarButton icon={copied ? "check" : "share"} label="Поділитись" onClick={copy} />;
}

/** Серце: те саме обране, що й було на сторінці, — лише знаком у хедері. */
function FavoriteAction({ target }: { target: FavoriteTarget }): ReactElement {
  const favorite = useFavorite(target);
  return (
    <BarButton
      icon="heart"
      label={favorite.liked ? "Прибрати з обраного" : "Додати в обране"}
      onClick={() => void favorite.toggle()}
      on={favorite.liked}
      disabled={favorite.busy}
    />
  );
}

/** Тема — та сама спільна панель `ThemeSheet`, що й у блоках сторінки. */
function ThemeAction(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BarButton icon="palette" label="Тема" onClick={() => setOpen(true)} />
      {open && <ThemeSheet onClose={() => setOpen(false)} />}
    </>
  );
}
