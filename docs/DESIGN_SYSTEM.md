<!-- токени + правила + де що лежить -->
# Design System

> Single source of truth for UI styling. Used by `web-platform-dev` and `web-admin-dev` via `@wwwuabot/shared/styles/`.

---

## CSS Tokens

Defined in `packages/shared/src/styles/tokens.css`, overridden per brand in `apple.css` / `android.css`.

### Colors

| Token | Usage |
|---|---|
| `var(--bg-page)` | Фон **екрана**: плоский колір, той самий, що йде нативному хрому Telegram (`= var(--chrome-header-bg)`). Ним малюються `body`, `.wb-app`, `main`, зони `.page-zone*`, `.wb-splash`, `.wb-auth` |
| `var(--bg-home)` | Градієнт-підкладка **поверхонь** (картки, панелі). Площину екрана ним НЕ малюємо: плоский колір клієнта не дорівняє градієнту — був би шов |
| `var(--bg-0)` … `var(--bg-4)` | Поверхні від підкладки до hover |
| `var(--text-primary)` / `--text-secondary` / `--text-muted` | Текст: основний / другорядний / підказка |
| `var(--text-inverse)` | Текст на акцентній плашці |
| `var(--accent)` / `--accent-hover` / `--accent-dim` / `--accent-soft` | Акцент: база / hover / плашка / підкладка під фокус |
| `var(--user-bg)` / `var(--user-text)` / `var(--user-accent)` | **Три кольори користувача**: фон / основний / акцент. Ставить `applyColors()` інлайном на `<html>` разом із `data-colors`; читає `user-colors.css`. Це **єдина** палітра продукту: усе вище (поверхні, текст, акцент, межі, статусні підкладки, хром) виведено з цих трьох через `color-mix()`, а не задано другим списком |
| `var(--user-on-accent)` | Підпис на акцентній плашці (`= var(--text-inverse)`): той із фону / основного, хто далі від акценту (`onAccentColor()`) |
| `data-colors-mode` (на `<html>`) | Схема, **виведена з фону** (`colorsMode()`): вибирає тіні, скрим, `color-scheme` і світлі варіанти статусних кольорів. Світлої / темної як вибору більше немає |
| `var(--border)` / `var(--border-subtle)` | Межі: помітна / ледь видима |
| `var(--surface)` / `--surface-hover` / `--surface-active` / `--surface-overlay` | Поверхні карток, стани й скрим |
| `var(--field-bg)` / `var(--field-ring)` | **Поле вводу**: колір поля (трохи інший за тло поверхні) і м'яка тінь по краях. Межу поля малює саме вони, а не лінія — одне правило на всі поля продукту (`.wb-input`, `.wb-select`, `.wb-textarea` і власні поля композера). Схема світла/темна — у `themes.css` |
| `var(--chrome-header-bg)` / `var(--chrome-bottom-bg)` | Нативний хром Telegram: шапка клієнта і смуга під футером; синхронізує `shared/app/telegram-chrome.ts`. З трьома кольорами користувача це рівно `--user-bg` (плоский hex — саме тому він іде клієнту як є). Наші смуги (`.wb-app-header`, `.wb-topbar`, `.wb-tabbar`) малюються тими самими токенами на 91% (прозорі на 9%) і **без** ліній та тіней |
| `var(--green)` / `var(--green-dim)` | Успіх |
| `var(--red)` / `var(--red-dim)` | Небезпека |
| `var(--yellow)` / `var(--yellow-dim)` | Попередження |

### Typography

| Token | Usage |
|---|---|
| `var(--font-ui)` | Primary UI font |
| `var(--font-display)` | Accent/heading font |
| `var(--font-mono)` | Monospace/code |

### Radius

| Token | Value |
|---|---|
| `var(--radius-xs)` | 2px |
| `var(--radius-sm)` | 4px |
| `var(--radius)` | 6px |
| `var(--radius-md)` | 8px |
| `var(--radius-lg)` | 12px |
| `var(--radius-xl)` | 16px |
| `var(--radius-full)` | 9999px (pills) |

### Spacing, elevation, motion

| Група | Токени |
|---|---|
| Відступи | `--sp-0` … `--sp-16` (4px-крок) |
| Мірки кнопки | `--btn-pad-y`, `--btn-pad-x` (задає і спільний шар, і бренд — `padding` у `.wb-btn` пише лише базове правило) |
| Тіні | `--shadow-xs` … `--shadow-xl`, `--elevation-0` … `--elevation-3` |
| Анімація | `--duration-fast`, `--duration`, `--duration-slow`, `--ease`, `--ease-in`, `--ease-out`, `--ease-spring` |
| Шари | `--z-dropdown` < `--z-sticky` < `--z-overlay` < `--z-modal` (400) < `--z-tabbar` (**1100** — футер завжди видно: він вище за модалки й виїзне меню) < `--z-toast` (1200) |

### Layout і мобільні

Це не «дизайн», а геометрія екрана — тому її теж використовуємо тільки через токени:

| Token | Призначення |
|---|---|
| `var(--sidebar-w)` / `--sidebar-w-collapsed` | Ширина бічної панелі на десктопі |
| `var(--drawer-w)` | Ширина виїзного меню на мобільному (те саме значення в обох оболонках) |
| `var(--scrim)` | Затемнення під drawer/модалкою |
| `var(--topbar-h)` / `--nav-bar-h` | Висоти хедерів і нижньої смуги (бренд: 56px Apple HIG, 60px Material — планка бренду плюс місце під залите коло активного розділу) |
| `var(--tab-bar-h)` | Повна висота нижнього футера = `--nav-bar-h` + `--safe-bottom` (не перевизначати третім числом) |
| `var(--safe-top)` / `var(--safe-bottom)` | Краї екрана: `env(safe-area-inset-*)` + `--tg-safe-area-inset-*` від Telegram |
| `var(--max-content)` | Максимальна ширина контенту |

> `--safe-*` != 0 лише тоді, коли в `index.html` є `viewport-fit=cover`. Без нього
> контент залазить під виріз і індикатор «додому» — і виглядає це як «десь дизайн поламався».

---


## Rules

1. Always use `.wb-*` classes — never define local `.btn`, `.modal`, `.card`.
2. Always use CSS tokens — never hardcode hex colors or pixel border-radius.
3. **Emoji in UI are forbidden** — use `<Icon />`.
4. **Dropdowns are forbidden** — use full-screen modals.
5. Brand themes: `data-brand` attribute on `<html>` (Apple / Material).
6. Колір — **три кольори користувача** (`data-colors` + `data-colors-mode` на `<html>`): фон / основний / акцент, усі обов'язкові. Світла чи темна — не вибір, а наслідок світлоти фону. Палітра з них виводиться в `user-colors.css`; другої таблиці «слот → токен» у TS немає.
7. New files MUST use `<Icon />` — never create local `const ico` helpers.
8. **Native `alert` / `confirm` / `prompt` are forbidden** — on iOS the Telegram WebView
   does not render them, so the button silently does nothing. Use `useDialog()`.
9. Actions are labelled with `<Icon />`, not Unicode glyphs: `↑`, `↓`, `✕` don't scale with
   `size`, aren't read by screen readers, and look different across fonts.
10. If shared code (`packages/ui`) renders a class, its styles live in
    `packages/shared/src/styles/` — not in one shell's `index.css`.
11. **A class without a rule is a bug, not a style.** `class="wb-mt-3"` in the markup
    with no `.wb-mt-3` anywhere renders nothing and fails silently: the spacing simply
    never appears, and no test catches it. Before adding a class to markup, add it to
    `components.css` — or use one that already exists. Enforced automatically:
    `npm run check:css` (the same gate in CI) fails when markup uses a class with no
    rule, or when shared code is styled in only one shell. Known debt lives in
    `scripts/css-baseline.mjs` and must shrink, never grow.
12. **Compose from bricks — don't draw your own chrome.** A shell's chrome is
    `.wb-app*`, `.wb-nav*`, `.wb-tabbar*`, `.wb-topbar*`, `.wb-page*`, `.wb-auth*`, `.wb-splash`,
    `.wb-profile*`, `.wb-profile-lookup`, `.wb-handle*` (`app-chrome.css`). A page that must scroll
    inside the panel adds `.wb-page-scroll`: the panel chrome keeps `overflow: hidden`, so the page
    has to bring its own scrolling. The same detail in both shells → a brick in
    shared; a new private class for the same thing is a defect, not "the shell's style".
    The profile's first block is the platform username: `.wb-handle*` (`-head`, `-badge`,
    `-info`, `-label`, `-name` (+`--empty`), `-hint`, `-form`, `-input-row`, `-at`, `-input`,
    `-error`, `-actions`) with `.wb-profile-note` / `-details` / `-summary` / `-subfields`
    for the rest. Whether the name can be edited is decided by one thing only — the presence
    of a save handler — so the visual stays identical in both shells.
    The global bottom footer (`.wb-tabbar`, `TabBar` from `@wwwuabot/ui/nav`) is one of those
    bricks: equal slots, the action `+` in the middle, profile at the far right. The active
    section is highlighted **by its own glyph, not by a background**: the shell hands over a
    solid twin of the outline icon (`iconActive`, e.g. `home` → `home-solid`), exactly like
    YouTube / Instagram / TikTok do it. A filled circle under the icon was tried on 14.09 and
    rejected — it shouts louder than the label it is meant to support.    It is `position: fixed`,
    so the content needs room under it (`.wb-tabbar-layout` / `.wb-app-body--tabbar`).
    The footer is **chrome**: no modal may cover it. It sits above modals and the drawer
    (`--z-tabbar` = 1100 > `--z-modal` = 400), and every modal leaves room for it —
    `html:has(.wb-tabbar) .wb-modal-overlay { padding-bottom: … + var(--tab-bar-h) }` — because
    the shared dialog renders at the app root, outside the shell. Selecting another section
    closes the composer (the shell owns that state), and the `+` toggles it.
13. **The composer (`+` in the footer) is one shared modal, not a per-shell screen.**
    `ComposerModal` (`@wwwuabot/ui/composer`) opens in both shells; its markup uses the same
    `.wb-modal*` bricks as `useDialog()` plus `.wb-composer*` (tabs as a compact column on the left —
    `.wb-composer-tabs` / `-tab` / `-tab-label`, note pane, stub pane, `.wb-composer-tool` for the
    icon-only attachment buttons). Labels vanish on narrow screens, so every tab and every icon-only
    button carries its name in `aria-label`.
    A tab and an attachment button are the **same cell** — one rule styles both (`.wb-composer-tab,
    .wb-composer-tool`): no border, no fill, radius, hover highlight. The cell size, the gap and the
    inset from the edge are **local variables on `.wb-composer`** (`--composer-cell` 46px,
    `--composer-gap`, `--composer-pad`), and the tab column and the attachment row both measure
    themselves with them — that is why the attachment row lands exactly on the first tab's level
    instead of drifting a few pixels. The tab column keeps its `--composer-col` (68px) at **every** width (8px side
    padding, so the cell inside stays ≥ 46px and the phone does not lose its tap target); the body's
    horizontal inset is `--sp-3`, which is what keeps the field off the column and off the edge. The
    width is a measure, not a taste: it is what lets the longest tab name ("Сторінка") sit on **one**
    line — a label that wraps mid-word ("Сторінк / а") is a layout defect, not a hyphenation, so the
    label is `nowrap` + ellipsis and never rides onto the field. The attachment row sits **above** the note field as the
    continuation of the tab column, so it is a row of cells, not of chips.
    The composer carries **no separator lines**: no rule under the title, none beside the tab column,
    none around a field, none above the action row — space does the separating. There is no
    instructional paragraph under the fields either: the label and the button already say what they
    do, and such a paragraph only eats room. The actions ("Закрити" / "Зберегти", and more to come)
    are **the last row of the tab's body** (`.wb-sheet-actions` — the same brick the note view uses,
    rule 18), not a pinned footer: the modal
    grows with its content, so a fixed bar would eat the fields' room; `margin-top: auto` holds them
    at the bottom while there is room and lets them scroll with the body when there is not.
    Its fields keep their own layout classes (`.wb-composer-field` / `-input` / `-tags`) — the text
    field is three rows tall with its own size rules and the hashtag row is a box for chips — but
    the **surface** comes from the shared field brick: one rule lists `.wb-input`, `.wb-select`,
    `.wb-textarea` and both composer fields, and paints them with `--field-bg` plus a soft
    `--field-ring`. A field is therefore visible everywhere by **colour and blurred edges**, not by
    a line, and the brand themes no longer force a border onto those classes with `!important`
    (Apple and Android only add radius and metrics now, so they cannot make one shell's fields look
    different from the other's). Each field also has a **label above it** (`.wb-label`), which is
    what says where things are in a modal without borders. Every field pins a **font floor of 16px**
    (`max(16px, 1em)`) **in its own rule**, not in a shared list: iOS WebKit enlarges the whole page
    when focus lands in a field with a smaller font (Android never does — hence "it only breaks on
    iPhone"), and a later rule of one field quietly overriding the shared floor is exactly how that
    bug came back twice. `packages/shared/src/styles/fields.test.ts` reads the CSS of the whole
    product and fails on any field below that floor. The note field is three rows tall, scrolls beyond that,
    and grows two ways: `resize: vertical` on desktop and with the text (`useAutoGrowField`, capped,
    and it never shrinks what a hand has dragged) on touch, where no WebView renders the handle.
    Hashtags are chips plus an inline input in the same row (`.wb-composer-tag*`): a tag ends on a
    space, a comma or Enter, and Backspace on an empty input drops the last one. Their rules are
    pure functions in `tags.ts`, since what counts as a tag decides whether the note is found
    later.
    Tabs are data (`tabs.ts`): a new tab is a line in the list, not new markup. A tab whose
    interface does not exist yet renders a statement of what will be there, and every unwired
    action answers with `useDialog()` ("that is a separate topic") instead of doing nothing
    silently on a phone. The footer's action slot carries its own `onSelect`
    (`ShellTab.onSelect` + `withPrimaryAction`): "create" is an action, not a route, so it has
    no `href` to invent.
14. Shared blocks (`packages/ui/src/blocks/*`) are still styled with inline
    `style={{ … }}` (192 objects there, 556 in live `src` overall; 97 hardcoded `#hex`),
    and **45 `wb-block-*` classes have no CSS rule at all**, so `data-brand` and
    `data-theme` don't reach them (вимір 13.09.2026). Moving those styles into `.wb-block-*` rules in
    `components.css` is open work — `docs/CONSOLIDATION_PLAN.md` §3 (пункт 3).
15. **Розділювач — не лінія.** Ні шапка модалки, ні футер картки, ні рядок таблиці
    не малюють штрих: місце відділяє простір, а структуру тримають **поверхня**
    (колір картки, шапки таблиці, смуга парних рядків), **м'яка тінь** (краї
    закріплених колонок) або сам контрол (залитий чип, залита кнопка, поле з
    `--field-bg`). Рамка лишається лише там, де вона — не прикраса, а зміст:
    індикатор (спінер, крапка незбереженого), пунктир порожнього слота
    («додати блок») і кільце фокуса/помилки.

    Правило спільне для **всіх** шарів: і `components.css`, і `app-chrome.css`,
    і бренди. Саме тому бренди більше не додають `border-bottom` рядкам
    таблиць, `border-right` меню чи `border` карткам: бренд — це характер
    (радіус, мірки, скло), а не повернення ліній, яких у продукті немає.

17. **A full-screen sheet is one brick, and the profile menu is its second user.** The
    surface is `.wb-sheet` / `.wb-sheet-head` (shadow instead of a border, safe-area padding,
    the phone radius) — it started as `.wb-composer` and was named after its first caller,
    which would have made the menu a second, near-identical copy of it. The composer still
    owns its layout tokens (`--composer-*`). The menu itself (`.wb-menu-body`,
    `.wb-menu-list`, `.wb-menu-item` (+ `--soon`), `.wb-menu-item-icon` / `-text` / `-label` /
    `-hint` / `-check`, `.wb-menu-ident*`) is rendered by the shared `MenuModal`
    (`@wwwuabot/ui/menu`), so a shell only supplies the list of items. A row is a
    **full-width tappable surface** (`--field-bg`, no border): a tap must land anywhere on the
    row, not just on the icon. A row whose screen does not exist yet says so **before the tap**
    (`status: "soon"` + a hint line under the label) and answers with `useDialog()` — an item
    that does nothing silently is the same defect as an unlabelled icon. `selected` draws a
    check, because a chosen row is a state, not a transition (the theme panel now
    arrives through `content` instead of the list). Both the profile and the
    theme panel are views of **one** modal (a "back" button appears only where there is
    something to return to), never a modal above a modal.

16. **Button metrics are tokens, not a brand's private `padding`.** How big a button is, is decided by
    `--btn-pad-y` / `--btn-pad-x`, and only the base `.wb-btn` rule writes `padding` — from those tokens.
    Apple and Android own the character (pill vs 20px radius, font, weight) and set the tokens; they no
    longer write `padding: 12px 24px !important` on `.wb-btn`, which made any reduction in the shared layer
    invisible — the same trap as the field border (rule 13). `packages/shared/src/styles/buttons.test.ts`
    fails on a `.wb-btn` padding that isn't the token pair, on a brand `min-height` above 44px, and on a
    pad token above 20×12px.

18. **Нотатки — один спільний екран, і його вигляд — чисті функції.** Список, смуга
    керування й перегляд живуть у `@wwwuabot/ui/notes` (кирпичики `.wb-note*`), а оболонка
    лише вирішує, **чиї** нотатки та куди їх писати (`createNotesApi` зі своїм транспортом).
    Пошук, фільтр, сортування й групування — один виклик `buildGroups(notes, view, now)` без
    React: тут помилка виглядає як «нічого не знайдено», а не як зламаний код. Тому: пошук
    вимагає **всі** слова запиту (теги в базі — без `#` і в нижньому регістрі), фільтр має
    три стани («усі» / «без хештегів» / вибрані теги — **кілька**, і нотатка мусить мати
    **кожен**: вибір звужує; не рядок-сентевел), а групи «за
    днями» рахуються від **локальної** опівночі, і `now` приходить аргументом — інакше
    «Сьогодні» залежало б від моменту виклику і тестом це не перевірити. **Типово груп немає**
    (`groupBy: "none"` в обох списках), а титул групи має сенс **лише коли груп кілька**.
    Вибори не випадають списком (правило 4): кожен відкриває ту саму поверхню `MenuModal`,
    а вибране позначене галочкою — це стан, а не перехід.
    Шапка сторінки й смуга їдуть разом і **лишаються на видноті** (`.wb-page-sticky` —
    спільний кирпичик каркаса в `app-chrome.css`, не лише нотаток): список довгий, і без цього
    пошук зникав рівно тоді, коли знайшлось те, що шукали. Тло шару — **непрозоре**
    (`--bg-page`), бо під ним їде вміст, а відступи сторінки віддано йому негативними
    полями: інакше крізь прогалину видно картки.
    Смуга — **спільний кирпичик** `@wwwuabot/ui/collection` (`CollectionToolbar`: свої варіанти й слова дає екран,
    сюди його вживають і нотатки, і контакти), і це **ОДИН ряд, який не переноситься** (`.wb-tools-bar`):
    пошук ліворуч, чотири — **клітинки-знаки** (`.wb-tools-btn`: та сама клітинка, що у вкладок композера — одне
    правило на всіх, без рамки й тла, але **32px**, а не планка пальця 44px: у смузі чотири контроли в ряд, і
    високий ряд забирав у списку більше екрана, ніж сам список, до якого веде — мірка ряду одна на всі контроли,
    `--tools-row-h`) поруч праворуч. Три з них — **вибори**, а четвертий (`.wb-tools-btn--toggle`) — **перемикач**
    «розгорнути / згорнути всі нотатки»:
    він не відкриває поверхню, а діє одразу, і тому показує стан сам собою (`aria-pressed` +
    заливка `--accent-dim`, як в активної вкладки композера). Розгорнутість карток — стан
    **екрана** (`openIds` + `onToggle`), а не картки: інакше «розгорнути всі» не було б як
    проштовхнути в кожну. Поле пошуку в спокої завширшки
    зі свій підпис («Пошук») і розкривається (`--open`) на фокус або запит: порожнє поле на всю
    ширину забирало місце саме в тих трьох, за якими людина приходить. Розкрите поле забирає
    **лише вільний простір** — перенос у смузі прибрано навмисно, бо з ним клітинки стрибали на
    другий рядок рівно тоді, коли людина зібралась друкувати; тому чипи вибраного стоять
    **окремим рядом під смугою** (`.wb-tools-chips`): вони не клітинки керування, а те, що ці
    клітинки змінили. Поле пошуку — **один контрол, і контрол тут саме поле**, а не оболонка з
    іконкою (`.wb-tools-search` — лише ряд). У спокої навколо поля немає ні заливки, ні рамки:
    воно стоїть поруч із трьома клітинками, і залите поле читалось як ще одна кнопка. На дотик
    заливка з **розмитим контуром** (`--tools-search-glow` — два розмиті ореоли, без лінії)
    з'являється навколо **місця, де пишуть**, а не навколо іконки. Мірки поля тут свої
    (`--tools-row-h`), бо мірки поля-в-полі зробили б ряд учетверо вищим за клітинки поруч; тому
    бренди задають пошуку лише радіус, а не мірки й кільце (`apple.css` / `android.css`). Шрифт
    лишається 16px — менший змушує iOS сам збільшувати сторінку (правило 13). ✕ у полі —
    **свій** (`.wb-tools-search-clear`), а не нативний: нативний у WebView малюється окремою
    коробкою зі своїм тлом і не піддається стилю. Ні підпису, ні заливки, ні
    **вибраного** в клітинці немає: «що зараз вибрано» показує чип
    (`.wb-tools-chip` — кнопка, тому дотик прибирає вибір), а ім'я клітинки й поточний стан
    читає `aria-label`.    Стан смуги стереже `NotesToolbar.test.tsx` — він читає й CSS, тож
    перенос, заливка в спокої або мірка ряду понад 32px провалюють тест, а не тихо повертаються.
    Склад чипів — чиста функція (`viewChips` у нотаток, `buildViewChips` у спільному модулі), бо
    «що вибрано і як це зняти» — правило, а не розмітка. Вибраних тегів може бути кілька,
    тож чип має **кожен окремо** (зняти один, не втративши решти) — на цьому й тримається
    мультивибір разом із `toggleTagFilter` (перемикає **один** тег, порядок стали́й — за
    абеткою, а прибраний останній тег вертає до «усі»: порожній вибір виглядав би як фільтр,
    який нічого не фільтрує). Дотик у пікері тегів тому **не** закриває поверхню — закриває ✕
    у шапці; а над списком стоїть рядок `.wb-menu-hint`, бо без нього множинний вибір
    читався б як одноразовий. Знаки різні навмисно (`sort` — порядок,
    `layers` — групи, `hash` — хештег): один знак на дві дії не каже нічого. Картка —
    **акордеон із двома рядками інфо, і всі закриті**: рядок 1 — початок тексту (він і
    забирає вільне місце, обрізається однією лінією, а переноси згортаються в пробіли) і дата
    з часом, рядок 2 — хештеги. Дата й хештеги навмисно **тихіші** за текст: підписи, такі ж
    голосні, як він, роблять зі списку суцільну сітку, де око ні за що не чіпляється — але
    приглушено **не означає найдрібніше**: обидва підписи картки — `--text-sm` (13px), а
    різнить їх колір (штамп `--text-muted`, хештег `--text-secondary`), бо `--text-xs` (12px)
    на телефоні не читався, а різний кегль у двох підписів одного рядка виглядав як недогляд.
    Хештег у картці — **підпис, а не чип** (`.wb-note-tag`, і це власний кирпичик, а не
    `.wb-chip` із вимкненим тлом): бренди задають чипу свої мірки з `!important` (Apple —
    `padding: 7px 16px`), і рядок хештегів виходив удвічі вищим за рядок із текстом, а самі
    хештеги розповзались на пів екрана; чипа тут просто немає, тому й воювати з брендом не
    треба (правило 13). **Знайдений** хештег (той, що знайшов пошук або фільтр — чиста
    `foundTags(tags, view)`) стоїть **акцентним кольором**: у стовпчику однакових підписів
    око не бачить, за що зачепився пошук. Акцент тут — колір, а не вага: підпис мусить
    лишатись підписом. Нічого не шукали — нічого й не знайдено (порожній список), бо акцент
    каже про дію, а не про наявність. Проміжок між двома рядками інфо — найменший
    (`--sp-1`), бо це один підпис під одним, а не сусідні блоки: більший читається як
    порожнеча в картці.
    Голова картки — кнопка на всю ширину (палець дістає будь-де), а тіло розкритої картки
    несе повний текст, обидві дати й дії — бо тіло всередині кнопки дало б кнопки в кнопці.
    Редагує **той самий** композер (`initial` із `id`), а підтвердження видалення дає
    оболонка: картка віддає дії нагору (`onEdit` / `onDelete`), а не робить їх сама.
    Кнопки дій будь-якої поверхні — `.wb-sheet-actions` (композер і картка — одна деталь).
    Вигляд списку — **спільний кирпичик** `@wwwuabot/ui/collection` (`CollectionViewSwitch` плюс
    чиста модель): рядки чи **картки-превью** й скількома колонками (1 / 2), як у товарів і новин.
    Кирпичик саме спільний, а не «для нотаток»: той самий вибір знадобиться товарам, новинам і
    постам, тож у ньому немає ні React-залежного стану, ні слова «нотатка». Клітинка
    (`.wb-collection-tool`) — та сама клітинка, що у вкладок композера (вона в списку селекторів
    тієї ж клітинки), а мірку бере від ряду (`--cell`), тому контроли смуги лишаються однієї
    висоти. Сам вибір — вибір (правило 4): відкриває ту саму поверхню `MenuModal` із трьома
    варіантами (**Рядки** / **Картки — 1 колонка** / **Картки — 2 колонки**) і галочкою на
    вибраному, знак у клітинці сталий (стан читає `aria-label`), а не типовий вигляд видно знімним
    чипом («Картки · 2»). Колонок у рядків немає — і це функція (`sameCollectionView`), а не
    намір: інакше «рядки · 1» і «рядки · 2» були б двома станами з галочкою на двох підписах
    одразу. Розкладку тримає **кирпичик**, а не список (`.wb-collection--rows` / `--cards` +
    `--cols-N`): список не пише `display` — інакше вибір вигляду залежав би від порядку правил у
    файлі. Плитки — **та сама розмітка** з іншою розкладкою: у рядку текст стоїть з датою однією
    лінією (`--tools-row-h` і обріз), у плитці — обрізається трьома рядками, а дата з кареткою
    стають під ним, хештеги — унизу (`min-height` не дає короткій нотатці виглядати як обрубок).
    Розкриття лишається тим самим і в плитках: картка росте на місці, тож «розгорнути всі» не
    перестає працювати від зміни вигляду.

19. **Колір задає людина трьома кольорами — і ніяк інакше.** Три обов'язкові слоти
    («Кольори теми»: фон / основний / акцент) живуть у `localStorage` (`wwwuabot-colors`) і на
    `<html>` як `--user-*`; панель — спільна `ThemeColorPanel`
    (`@wwwuabot/shared/components/theme`), яку обидві оболонки показують в одній і тій самій
    поверхні (`.wb-sheet`: платформа — вмістом меню профілю, адмінка — кнопкою «Тема»).
    Панель — три **закриті** акордеони (`ThemeSection`) від загального до часткового:
    **Стиль** (характер Apple / Material — уся оболонка на один дотик), **Кольори теми**,
    **Готові палітри** — палітри не налаштування, а швидкий старт, тож вони внизу й
    закриті: відкрита секція — це вибір людини, а не стан панелі. Правило «порожніх не буває» — це
    функція (`isCompleteColors`), а не намір: без усіх трьох вибір не зберігається й не
    застосовується. Готові палітри — `color-presets.ts` (від чорного до білого), а вибір
    окремого кольору **не вимагає знання кодів** (`ColorEditor`): спершу **зразки** — сітка
    12 відтінків × 3 світності плюс смуга від чорного до білого (`COLOR_CHART` /
    `COLOR_SHADES`), потім **системна палітра** (`input type="color"` — уся гама, піпетка),
    і аж потім точність: повзунки H/S/L із намальованими доріжками (`HUE_TRACK` /
    `channelTrack`) і код кольору. Панель відкривається **не порожньою**: поки вибору немає,
    слоти стартують із кольорів, які вже на екрані (`activeColorsFromDom`), а порожній слот
    (після «Прибрати») малюється пунктиром, бо «не вибрано» — це стан, який видно до дотику.
    Кольори **застосовуються живцем** (неповний вибір — ні), а «Скинути» вертає брендову
    палітру — і показує її в слотах, а не три пусті квадрати. Стан збереження панель
    називає **рядком** (`.wb-theme-status`: «Незбережені зміни» → «Збережено на цьому
    пристрої»), бо кнопка, що просто сіріє, читається як «не спрацювала». Тому кнопок дві:
    «Зберегти» лишає панель відкритою (стан видно, вибір можна доправити), а «Зберегти і
    закрити» — те саме плюс вихід через `onClose`, який передає оболонка (сама панель не
    знає, чим її відкрито). Вихід без збереження вертає палітру **зі сховища**, а не зі стану
    компонента: «Зберегти і закрити» закриває панель тим самим дотиком, тож розмонтування
    стається до перерендера зі свіжим `saved` — і знятий зі стану знімок показав би стару тему
    до перезавантаження (саме так це й ламалось).

20. **«МоїКонтакти»: контакт — запис, а лінк — його поле; приєднання — два кроки.** Екран (`/contacts`) зводить спільний
    `@wwwuabot/ui/contacts` (кирпичики `.wb-contact*` у власному `contacts.css` — як `theme-panel.css`, бо це
    цілісна деталь), а список улаштований **як «Нотатки»**: групи, акордеони й та сама **спільна смуга
    керування** з `@wwwuabot/ui/collection` (`CollectionToolbar`, чипи — `buildViewChips`, правила хештега й днів —
    `tags.ts` / `days.ts`), а контакти підставляють лише свої варіанти й слова. Закритий рядок показує **два рядки інфо**:
    номер, ім'я з датою-часом зміни і стан **словом** («без лінка» / «лінк чекає» / «зайшов у бота» /
    «приєднався»), а хештеги — підписами (`.wb-contact-tag`, не чип: бренди задають чипу мірки з `!important`;
    **знайдений** тег стоїть акцентом). **Дотик розгортає рядок**: у тілі — етапи (`.wb-contact-stage*`, «Запрошено» →
    «Зайшов у бота» → «Зайшов на платформу»), лінк **за станом** (немає коду → «Створити лінк», код є → діплінк і
    «Копіювати», за лінком уже прийшли → **ані того, ані того**), обидві дати, глибина гілки («Залучив(ла) ще N») і
    дії — а **дії віддаються нагору** (`onEdit` / `onDelete` / `onMakeLink` / `onCopyLink`): буфер, діалоги й підтвердження належать оболонці (та сама межа, що в нотатках). **Правка — у формі** (`ContactSheet`, та сама
    поверхня `.wb-sheet`), і там **лише власні поля** (ім'я, `@username`, хештеги, примітки) — **поля «Telegram ID»
    немає**, бо id людини власник не знає, його бачить бот. **Числа — три плашки («Всього / Бот / Платформа») у ряд із
    назвою екрана** (не блоком під нею): плашка — та сама «плитка списку» (`--field-bg`), стиснута під місце в
    шапці — число зверху, підпис під ним (у розмітці `dt` **перед** `dd`, а порядок на екрані дає `column-reverse`).
    Йдуть вони **за спаданням**: «Всього» рахує **усі записи** (і контакт без лінка), а «Бот» і «Платформа» —
    **людей, а не картки** (два лінки на одну людину дають два записи й одного в лійці; той, хто на платформі,
    порахований і в «у боті»). Рядок-пояснення під числами **зник** — різницю видно в списку, де дубль підписаний «та
    сама людина, що …» (`.wb-contact-twin`). Блок «схема залучених» **теж зник**, а дія переїхала **під числа, на всю
    ширину** (`.wb-page-cta`: коли в шапці стоять числа, кнопка в ній тиснула б на них, а півширини на телефоні
    читались би як підпис): **«Додати контакт»** питає ім'я, створює запис, **одразу складає лінк, кладе його в буфер** і відкриває форму.

---

## File Locations

| File | Purpose |
|---|---|
| `packages/shared/src/styles/tokens.css` | CSS custom properties |
| `packages/shared/src/styles/user-colors.css` | Палітра, виведена з трьох кольорів користувача (`color-mix`) |
| `packages/shared/src/styles/theme-panel.css` | Кирпичики панелі «Тема» (`.wb-theme-*`): секції-акордеони, палітри, зразки, системний вибір, повзунки |
| `packages/shared/src/components/theme/` | `ThemeColorPanel` + `color-presets.ts` / `user-colors.ts` / `useUserColors` — вибір трьох кольорів |
| `packages/shared/src/styles/apple.css` | Apple brand overrides |
| `packages/shared/src/styles/android.css` | Material brand overrides |
| `packages/shared/src/styles/components.css` | `.wb-*` component styles (включно з `.wb-dialog*` і кирпичиком вигляду колекції `.wb-collection*`) |
| `packages/shared/src/styles/contacts.css` | Кирпичики «МоїКонтакти» (`.wb-contact*`): три плашки чисел (у шапці), рядок-акордеон (і плитковий режим), тіло з етапами й лінком, форма · `packages/ui/src/contacts/` — `ContactList` (групи + акордеон), `ContactSheet` (форма), `ContactTotals`, `ContactsToolbar` і чисті `view.ts` / `scheme.ts` |
| `packages/ui/src/collection/` | Спільні кирпичики списків: `CollectionToolbar` (пошук, вибори, чипи, перемикач), `CollectionViewSwitch`, `buildViewChips`, правила хештега (`tags.ts`) і днів (`days.ts`), модель вигляду (рядки чи картки-превью й колонки) |
| `packages/shared/src/styles/app-chrome.css` | кирпичики каркаса оболонки: app / nav / **tabbar (нижній футер)** / topbar / page / auth / splash / profile |
| `packages/shared/src/styles/page-layout.css` | каркас сторінки для `PageRenderer` |
| `packages/shared/src/styles/drawer.css` | виїзне меню й гамбургер (обидві оболонки) |
| `scripts/check-css-classes.mjs` | перевірка «клас у розмітці ↔ правило в CSS» (гейт CI) |
| `scripts/css-baseline.mjs` | задокументований борг для цієї перевірки (тільки зменшувати) |
| `packages/ui/src/dialog/` | `DialogProvider` + `useDialog()` |
| `packages/ui/src/nav/` | `TabBar` — глобальний нижній футер (розмітка й активи спільні, пункти — з оболонки) |
| `packages/ui/src/composer/` | `ComposerModal` — модалка швидкого створення (відкриває «+» футера) |
| `packages/ui/src/menu/` | `MenuModal` + `buildMenuItems` — повноекранна поверхня зі списком пунктів (відкриває «Профіль» футера; склад — з оболонки; слот `content` показує свій вміст замість списку — так приходить панель теми) |
| `packages/ui/src/notes/` | `NotesList` (картка-акордеон) і `NotesToolbar` (нотаткова настройка спільної смуги) + чисті `view.ts` — пошук, фільтр, сортування, групування (екран платформи `/notes`) |
| `packages/shared/src/components/icons.tsx` | SVG icon definitions |
| `packages/shared/src/components/Icon.tsx` | `<Icon />` component |
| `packages/shared/src/components/StyleToggle.tsx` | `ThemeButton` component |
