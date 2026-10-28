/**
 * `AppBar` — глобальний хедер застосунку.
 *
 * **Один хедер на всі екрани.** Він стоїть у каркасі (`PlatformShell`) і
 * закріплений завжди, тож назва екрана та дії лишаються на місці, коли вміст
 * скролиться. Що саме показувати — вирішує екран (`useScreenChrome`), а малює
 * це один кирпичик.
 *
 * **Ліворуч — «Назад», меню й назва; праворуч — самі знаки.** Знак без підпису
 * читається тут, бо кожен сказав би одне слово («Поділитись», «В обране»,
 * «Тема»), а три слова в 44-кнопковому рядку з'їли б назву сторінки на
 * телефоні. Підпис лишається в `aria-label` і `title`.
 *
 * **«Назад» — на кожному екрані.** Людина прийшла з конкретної сторінки, тож
 * повернутися має саме туди, звідли прийшла. Кнопка живе тут, а не в кожному
 * екрані окремо: тоді її не забуде той, хто малює нову сторінку.
 *
 * **Палітра відкриває меню вигляду**, а не веде на сторінку: вибір кольорів і
 * шрифту — це два розкриті пункти й рядок «Відмінити / Застосувати», тобто
 * рівно те, що вміщується в меню. Роутера в цьому кирпичику немає, тож дію
 * передає оболонка (`onTheme`, `onBack`).
 *
 * **Хедер сам каже, скільки він займає** (`useAppBarHeight` → `--appbar-h`):
 * від цього числа відлічують закріплені речі сторінки, а висота залежить від
 * шрифту людини та довжини назви — числом із CSS її не задати.
 *
 * @module packages/ui/src/nav/AppBar
 */

import { useContext, useRef, useState, type ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import type { FavoriteTarget } from "@wwwuabot/shared/favorites";
import { ScreenChromeContext, type ScreenChrome } from "./screen-chrome";
import { useAppBarHeight } from "./useAppBarHeight";
import { ShareModal } from "./ShareModal";
import { useFavorite } from "../favorites/useFavorite";
import { LikeToast } from "../favorites/LikeToast";

/** Дії, які знає тільки оболонка: вона одна володіє роутером. */
export interface AppBarActions {
  /** Повернутися на екран, з якого прийшли. */
  onBack: () => void;
  /** Відкрити меню вигляду (теми). */
  onTheme: () => void;
  /** Ім'я бота для діплінка «Поділитись»; `null` — діплінка не буде. */
  botUsername?: string | null;
}

export function AppBar({ onBack, onTheme, botUsername = null }: AppBarActions): ReactElement | null {
  const chrome = useContext(ScreenChromeContext)?.chrome;
  if (!chrome) return null;
  return <AppBarView chrome={chrome} onBack={onBack} onTheme={onTheme} botUsername={botUsername} />;
}

/**
 * Сама розмітка хедера — окремо від контексту, щоб її можна було перевірити
 * тестом без рендеру оболонки: що показується, а що прибирається.
 */
export function AppBarView({
  chrome,
  onBack,
  onTheme,
  botUsername = null,
}: { chrome: ScreenChrome } & AppBarActions): ReactElement {
  const { title, menu, share, favorite } = chrome;
  const header = useRef<HTMLElement>(null);
  const [sharing, setSharing] = useState(false);
  useAppBarHeight(header);

  return (
    <header className="wb-appbar" ref={header}>
      {/* Підтвердження лайка народжується тут, у серці, і малюється порталом
          поверх екрана: місце йому — не в смузі й не в шапці. */}
      <LikeToast />
      <div className="wb-appbar__lead">
        <BarButton icon="arrow-left" label="Назад" onClick={onBack} />
        {menu && <BarButton icon="menu" label="Меню сторінки" onClick={menu} />}
        <h1 className="wb-appbar__title">{title}</h1>
      </div>

      <div className="wb-appbar__actions">
        {share && <BarButton icon="share" label="Поділитись" onClick={() => setSharing(true)} />}
        {favorite && <FavoriteAction target={favorite} />}
        <BarButton icon="palette" label="Тема" onClick={onTheme} />
      </div>
      {share && sharing && (
        <ShareModal share={share} botUsername={botUsername} onClose={() => setSharing(false)} />
      )}
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

/**
 * Серце: те саме обране, що й було на сторінці, — лише знаком у хедері.
 *
 * Коли сторінка в обраному, знак стає **залитим**: контур акцентного кольору
 * виглядав тією самою кнопкою, лише пофарбованою, тож стан доводилось
 * згадувати замість того, щоб його побачити.
 */
function FavoriteAction({ target }: { target: FavoriteTarget }): ReactElement {
  const favorite = useFavorite(target);
  return (
    <BarButton
      icon={favorite.liked ? "heart-solid" : "heart"}
      label={favorite.liked ? "Прибрати з обраного" : "Додати в обране"}
      onClick={() => void favorite.toggle()}
      on={favorite.liked}
      disabled={favorite.busy}
    />
  );
}
