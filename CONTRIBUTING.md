# Contributing to wwwuabot

Rules for developers, contributors, and AI agents.

---

## Quality Gates (обов'язково перед кожним пушем)

```bash
npm test             # Vitest
npm run typecheck    # TypeScript strict — 0 any, 6 воркспейсів
npm run lint         # ESLint — 0 errors, 0 warnings
npm run format:check # Prettier
```

Якщо хоч одна команда падає — код не пушиться в `main`.

### Що саме перевіряє CI

Пуш у `main` **заблоковано**, поки не пройдуть усі гейти. Вони виконуються в одній джобі `checks`
перед будь-яким деплоєм:

| Гейт | Команда | Що ловить |
|---|---|---|
| Залежності | `npm ci` | lockfile розійшовся — збірка не відтворювана |
| CVE | `npm audit --audit-level=high` | відомі вразливості |
| Лінт | `npm run lint` | `any`, мертвий код, зайві залежності |
| Типізація | `npm run typecheck` | помилки типів у всіх воркспейсах |
| Тести | `npm test` | регресії |
| Форматування | `npx prettier --check .` | стиль |
| Класи й CSS | `npm run check:css` | клас у розмітці без правила; спільний код, стилізований лише в одній оболонці |
| Планка правил | `npm run check:quality` | ліміт рядків, нативні діалоги, голий `100vh`, емодзі в UI (`docs/QUALITY_GATE.md`) |
| Документація | `npm run check:docs` | розмір, мертві посилання, згадані шляхи, `AGENTS.md §N` |
| Схема D1 | `npm run check:db` | таблиця або `CREATE TABLE` поза реєстром (`docs/DATA_MODEL.md`) |

Гейти запускаються і на кожен pull request (деплой на PR неможливий). Деплої одного воркера не
перекриваються: `concurrency` ставить їх у чергу, щоб старіший коміт не ліг поверх новішого.

---

## Конвенція комітів

```
<type>(<scope>): <опис>
```

Типи: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
Скоупи: `shared`, `ui`, `bot`, `api`, `web`, `admin`, `ci`, `docs`

Приклади:

- `feat(builder): add link-button block`
- `fix(api): validate user dates in UsersService`
- `refactor(admin): decompose PageBuilderPage into hooks`
- `test(bot): add screen routing tests`

---

## Правила

1. **Нульова толерантність до `any`.** Точні типи, дженерики або `unknown` з type-guards.
2. **Правило «двічі — в спільне».** Код, що повторюється 2+ рази, йде в `packages/shared/` або
   `packages/ui/`. Не копіюй між воркерами.
3. **Кристалева ясність.** Файл > 200 рядків = червоний прапорець, > 400 = критично. Компонент =
   рендеринг. Хук = логіка. Хелпер = чисті функції.
4. **Нові файли використовують `<Icon />`** зі shared замість локальних `const ico`.
5. **Емоджі в UI заборонені** — тільки SVG-іконки. Дропдауни теж: замість них повноекранна
   поверхня (`MenuModal`).
6. **Єдиний API-шлюз** — нові REST-ендпоїнти в `api-dev/`, не в інших воркерах.
7. **Блок-дефінції** — компактний запис через хелпери (`block()`, `s()`, `n()`, `b()`, `e()`), не
   JSON-схеми.
8. **Не роби `SELECT *`** на таблицях з важкими JSON-колонками.
9. **Не змішуй prod/dev** — різні `database_id` в `wrangler.toml`.
10. **Нативні `alert` / `confirm` / `prompt` заборонені** — у Telegram Mini App на iOS вони не
    працюють. Використовуй `useDialog()` з `@wwwuabot/ui/dialog` (`AGENTS.md` §4).
11. **Спільний код => спільний CSS.** Якщо клас рендерить `packages/ui`, його стилі живуть у
    `packages/shared/src/styles/`, а не в `index.css` однієї з оболонок — інакше в другій оболонці
    він буде без стилів.
12. **Мобільний — перший.** Перевіряй на 360px до десктопа: резинова верстка, `100dvh`,
    `var(--safe-*)`, тап-таргети ≥44px, афорданси без `:hover` (`AGENTS.md` §3).
13. **Клас без правила — це помилка, а не стиль.** Потрібен клас у розмітці — спочатку додай правило
    в `packages/shared/src/styles/`. `class="wb-mt-3"` без `.wb-mt-3` не ламає ні збірку, ні тести:
    відступ просто не з'явиться.

---

## Структура воркспейсів

| Папка | Призначення | Стек |
|---|---|---|
| `bot-dev/` | Telegram-бот | grammY, D1, Queues |
| `api-dev/` | REST API | D1, KV, власний router (`src/router.ts`) |
| `web-platform-dev/` | Telegram Mini App | React 19, Vite 8, Tailwind 4 |
| `web-admin-dev/` | Адмін-панель | React 19, Vite 8, Page Builder |
| `packages/shared/` | Спільні типи, утиліти, стилі, іконки | TypeScript |
| `packages/ui/` | Спільні React-компоненти | React 19 |

---

## Додавання нового блоку Page Builder

1. Створити компонент у `packages/ui/src/blocks/<Ім'яБлоку>.tsx`
2. Додати запис у `BLOCK_DEFINITIONS` через хелпери (`packages/shared/src/constants/block-definitions/`)
3. Зареєструвати в `registerAllBlocks()` (`packages/ui/src/blocks/index.ts`)

## Додавання нового типу кнопки

1. Додати до `ButtonKind` у `web-admin-dev/src/features/scenarios/keyboard/types.ts`
2. Оновити `toTelegramButton()` / `fromTelegramButton()` у `keyboard.utils.ts`
3. Додати опцію в `KeyboardEditor.tsx` і `validateButtons()`

## Додавання нового спільного коду (чек-ліст)

1. Чи є ця функція в іншому воркері? → Використовуй, не копіюй.
2. Чи специфічна для одного воркера? → Не внось у shared.
3. Потрібна в 2+ воркерах? → Клади в `packages/shared/`.
4. Додай типи та JSDoc.
5. Онови `AGENTS.md` при новій конвенції.

---

## Документація

| Файл | Для кого |
|---|---|
| `AGENTS.md` | AI-агенти: архітектура, терміни, правила |
| `CONTRIBUTING.md` | Розробники: процес, quality gates, конвенції |
| **`docs/README.md`** | **покажчик усієї документації — почни звідси** |

Решта документів — за покажчиком. Факт має **одного власника**: якщо правило чи число потрібне в
двох місцях, його тримає один документ, а інші посилаються.
