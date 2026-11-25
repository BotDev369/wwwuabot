/**
 * Головна — обкладинка й меню: на обкладинці назва, нижче самі пункти картками
 * без підписів груп (як у Tribute). Поки `/api/screens` не відповів, меню йде
 * з реєстру. Розкладка — `docs/DESIGN_AGREED.md`, розділ 4а.
 *
 * Список розділів тут — той самий `PlatformNavList`, що й у меню: одне джерело,
 * два місця відображення.
 *
 * @module web-platform-dev/src/pages/entry/EntryPage
 */

import { useEffect, useRef, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { SCREENS, type ScreenRow } from "@wwwuabot/shared/screens";
import { PlatformNavList } from "@/layout/PlatformNavList";
import { platformNav } from "@/layout/screen-nav";
import { useScreens } from "@/layout/useScreens";

/** Реєстр у формі рядків: та сама форма, що приходить із `/api/screens`. */
const REGISTRY_ROWS: readonly ScreenRow[] = SCREENS.map((screen) => ({
  key: screen.key,
  parentKey: screen.parent,
  title: screen.title,
  icon: screen.icon,
  sortOrder: screen.sort,
  inMenu: screen.inMenu,
  texts: {},
}));

/**
 * Скільки зірок-спалахів і відблисків у бульбашках живе на обкладинці. Вони
 * стоять на тих самих місцях, що й намальовані у файлі, — тому це не нові
 * знаки, а спалах наявних.
 */
const STARS = 8;
const GLINTS = 7;

/**
 * Тихий режим: заради нього рух вимикається, а не зменшується. У jsdom
 * `matchMedia` немає — там вважаємо, що рух дозволений (тести не про нього).
 */
function calmMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function EntryPage(): ReactElement {
  const navigate = useNavigate();
  const { rows } = useScreens();
  const page = useRef<HTMLElement>(null);
  const hero = useRef<HTMLElement>(null);
  const groups = platformNav(rows.length > 0 ? rows : REGISTRY_ROWS, "/");

  // Паралакс — від прокрутки, а не від часу: кадр рухається лише тоді, коли
  // людина гортає, і рівно одним кадром на подію. `will-change` не ставимо:
  // шар і так композитний, а пам’ять на телефоні дорога.
  useEffect(() => {
    const node = hero.current;
    if (!node || calmMotion()) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const shift = Math.min(window.scrollY, node.offsetHeight);
      node.style.setProperty("--hero-shift", `${shift}px`);
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
      node.style.removeProperty("--hero-shift");
    };
  }, []);

  // Обкладинка на весь екран не каже, що під нею пункти: підказка веде туди ж,
  // куди й прокрутка, і не змушує вгадувати, чи список узагалі є.
  const toGroups = () => {
    const list = page.current?.querySelector<HTMLElement>(".wb-showcase-groups");
    list?.scrollIntoView({ behavior: calmMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    <main className="wb-showcase" ref={page}>
      <section className="wb-showcase-hero" ref={hero}>
        <span className="wb-showcase-frame">
          <img
            className="wb-showcase-photo"
            src="/media/home-hero.jpg"
            alt=""
            width={880}
            height={1184}
            // Обкладинка — перший екран: кадр просимо найпершим, а не після CSS.
            fetchPriority="high"
            decoding="async"
          />
          <span className="wb-showcase-stars" aria-hidden="true">
            {Array.from({ length: STARS }, (_, index) => (
              <span key={index} />
            ))}
          </span>
          <span className="wb-showcase-glints" aria-hidden="true">
            {Array.from({ length: GLINTS }, (_, index) => (
              <span key={index} />
            ))}
          </span>
        </span>
        <span className="wb-showcase-glow" aria-hidden="true" />
        <span className="wb-showcase-shade" aria-hidden="true" />
        <div className="wb-showcase-brand">
          <h1 className="wb-showcase-title">ПАЛЯНИЦЯ</h1>
          <p className="wb-showcase-tagline">платформа для своїх</p>
          <button
            type="button"
            className="wb-showcase-cue"
            aria-label="До розділів"
            onClick={toGroups}
          >
            <Icon name="arrow-down" size={34} className="wb-showcase-cue__arrow" />
          </button>
        </div>
      </section>

      <PlatformNavList groups={groups} onNavigate={(href) => void navigate(href)} />
    </main>
  );
}
