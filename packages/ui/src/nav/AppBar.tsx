/**
 * `AppBar` — глобальний хедер застосунку.
 *
 * **Один хедер, стек рівнів.** Перший рядок — бренд і «МЕНЮ»; далі кожен
 * батьківський рівень і поточна сторінка стоять **окремими рядками**
 * (`ancestors` + `title`). Тому на будь-якій глибині видно весь шлях.
 *
 * **Два способи показати стек.** Звичайний екран ставить його відразу.
 * Екран із великим `h1` (`titleMode: "hero"`) тримає хедер однорядковим, поки
 * велика назва видима; коли вона йде під хедер, стек стає **другим рядком
 * хедера** — так само, як на сторінці без `h1`. Окремого плаваючого шару
 * немає: назва поводиться однаково з «Магазинами» й рештою екранів.
 *
 * **Рівні не переносяться.** Кожен рядок — один рівень; довгий обрізається
 * трикрапкою, щоб висота стека не стрибала.
 *
 * **МЕНЮ — текстова кнопка, а не гамбургер.** Вона відкриває правий сайдбар;
 * меню й перемикач теми живуть у ньому, а не в хедері. Хедер не знає про
 * роутер: дію передає оболонка (`onMenu`, `menuOpen`).
 *
 * **Хедер сам каже, скільки він займає** (`useAppBarHeight` → `--appbar-h`):
 * від цього числа відлічують закріплені речі сторінки, а висота залежить від
 * шрифту людини та наявності другого рядка — числом із CSS її не задати.
 *
 * @module packages/ui/src/nav/AppBar
 */

import { useContext, useEffect, useRef, useState, type ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import type { FavoriteTarget } from "@wwwuabot/shared/favorites";
import { ScreenChromeContext, type ScreenChrome, type ScreenCrumb } from "./screen-chrome";
import { useAppBarHeight } from "./useAppBarHeight";
import { ShareModal } from "./ShareModal";
import { useFavorite } from "../favorites/useFavorite";
import { LikeToast } from "../favorites/LikeToast";

/** Дії, які знає тільки оболонка: вона одна володіє роутером. */
export interface AppBarActions {
  /**
   * Готовий стан хедера, якщо його порахував каркас: крохи будуються з реєстру
   * екранів, і лише оболонка знає, який розділ стоїть над сторінкою.
   */
  chrome?: ScreenChrome;
  /** Перехід за рівнем шляху: хедер не знає про роутер. */
  onNavigate?: (href: string) => void;
  /** Відкрити або закрити меню продукту (правий сайдбар). */
  onMenu?: () => void;
  /** Меню відкрите — для `aria-expanded`. */
  menuOpen?: boolean;
  /** Ім'я бота для діплінка «Поділитись»; `null` — діплінка не буде. */
  botUsername?: string | null;
}

export function AppBar({
  chrome: given,
  onMenu,
  onNavigate,
  menuOpen = false,
  botUsername = null,
}: AppBarActions): ReactElement | null {
  const chrome = given ?? useContext(ScreenChromeContext)?.chrome;
  if (!chrome) return null;
  return (
    <AppBarView
      chrome={chrome}
      onMenu={onMenu}
      onNavigate={onNavigate}
      menuOpen={menuOpen}
      botUsername={botUsername}
    />
  );
}

/**
 * Сама розмітка хедера — окремо від контексту, щоб її можна було перевірити
 * тестом без рендеру оболонки: що показується, а що прибирається.
 */
export function AppBarView({
  chrome,
  onMenu,
  onNavigate,
  menuOpen = false,
  botUsername = null,
}: { chrome: ScreenChrome } & AppBarActions): ReactElement {
  const { title, ancestors, titleMode, share, favorite } = chrome;
  const header = useRef<HTMLElement>(null);
  const [sharing, setSharing] = useState(false);
  // `hero` — велика назва в контенті; хедер тримає її компактну копію
  // згорнутою, доки `h1` не піде під хедер.
  const heroTitle = titleMode === "hero";
  const [titleInHeader, setTitleInHeader] = useState(false);
  // Останній рівень — поточна сторінка; попередні — її батьки (з реєстру).
  const trail: readonly ScreenCrumb[] = title
    ? [...ancestors, { label: title, href: null }]
    : ancestors;
  const ancestorsKey = JSON.stringify(ancestors);

  useAppBarHeight(header);

  useEffect(() => {
    if (!heroTitle || !title) {
      setTitleInHeader(false);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const target = document.querySelector<HTMLElement>("[data-screen-title]");
      // Без великого `h1` (наприклад, варіант без шапки) назва мусить лишитись
      // у хедері — інакше екран узагалі без назви.
      if (!target) {
        setTitleInHeader(true);
        return;
      }
      const headerBottom = header.current?.getBoundingClientRect().bottom ?? 0;
      setTitleInHeader(target.getBoundingClientRect().bottom <= headerBottom);
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    schedule();
    // `scroll` не бульбашить, але ловиться на фазі перехоплення — тож працює
    // і для вікна, і для власного скрол-контейнера сторінки.
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [heroTitle, title, ancestorsKey]);

  return (
    <header className={`wb-appbar${heroTitle ? " wb-appbar--hero" : ""}`} ref={header}>
      {/* Підтвердження лайка народжується тут, у серці, і малюється порталом
          поверх екрана: місце йому — не в смузі й не в шапці. */}
      <LikeToast />
      <div className="wb-appbar__top">
        <div className="wb-appbar__brand">
          <span className="wb-appbar__brand-name">ПАЛЯНИЦЯ</span>
        </div>

        <div className="wb-appbar__actions">
          {share && <BarButton icon="share" label="Поділитись" onClick={() => setSharing(true)} />}
          {favorite && <FavoriteAction target={favorite} />}
          {onMenu && (
            <button
              type="button"
              className="wb-appbar__menu"
              aria-label="Меню"
              aria-expanded={menuOpen}
              onClick={onMenu}
            >
              МЕНЮ
            </button>
          )}
        </div>
      </div>

      {trail.length > 0 && (!heroTitle || titleInHeader) && (
        <nav className="wb-appbar__trail" aria-label="Шлях сторінки">
          {trail.map((crumb, index) => {
            const current = index === trail.length - 1;
            const label = crumb.label;
            return (
              <span className="wb-appbar__step" key={`${index}-${label}`}>
                {index > 0 && (
                  <span className="wb-appbar__sep" aria-hidden="true">
                    ›
                  </span>
                )}
                {current || !crumb.href || !onNavigate ? (
                  current ? (
                    <h1 className="wb-appbar__crumb wb-appbar__crumb--current" title={label}>
                      {label}
                    </h1>
                  ) : (
                    <span className="wb-appbar__crumb" title={label}>
                      {label}
                    </span>
                  )
                ) : (
                  <a
                    className="wb-appbar__crumb wb-appbar__crumb--link"
                    href={crumb.href}
                    title={label}
                    onClick={(event) => {
                      // SPA-перехід: повне перезавантаження в TWA втрачає стан.
                      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                      event.preventDefault();
                      onNavigate(crumb.href as string);
                    }}
                  >
                    {label}
                  </a>
                )}
              </span>
            );
          })}
        </nav>
      )}
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
