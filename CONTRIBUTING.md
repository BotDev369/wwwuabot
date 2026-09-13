# Contributing to wwwuabot

Rules for developers, contributors, and AI agents.

---

## Quality Gates (обов'язково перед кожним пушем)

```bash
npm test            # 182 unit-тести (Vitest), 22 файли
npm run typecheck   # TypeScript strict — 0 any, 6 воркспейсів
npm run lint        # ESLint — 0 errors, 0 warnings
npm run format:check # Prettier — теж гейт CI
```

Якщо хоча б одна команда падає — код не пушиться в `main`.

### Що саме перевіряє CI

З 11.09.2026 пуш у `main` **заблоковано**, поки не пройдуть усі гейти. Вони
виконуються в одній джобі `checks` перед будь-яким деплоєм:

| Гейт | Команда | Блокує деплой? |
|---|---|---|
| Залежності | `npm ci` | так (lockfile розійшовся — збірка не відтворювана) |
| CVE | `npm audit --audit-level=critical` | так (раніше стояв `continue-on-error: true`, тобто не блокував нічого) |
| Лінт | `npm run lint` | так |
| Типізація | `npm run typecheck` | так |
| Тести | `npm test` (182) | так (S-6 закрито) |
| Форматування | `npx prettier --check .` | так — 201 файл відформатовано 12.09.2026, гейт увімкнено |

Гейти запускаються і на кожен pull request (деплой на PR неможливий).
Деплої одного воркера не перекриваються: `concurrency` ставить їх у чергу,
щоб старіший коміт не ліг поверх новішого.

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

1. **Нульова толерантність до `any`.** Використовуй точні типи, дженерики або `unknown` з type-guards.
2. **Правило «двічі — в спільне».** Код, що повторюється 2+ рази, йде в `packages/shared/` або `packages/ui/`. Не копіюй між воркерами.
3. **Кристалева ясність.** Файл >200 рядків = червоний прапець. Файл >400 = критично. Компонент = рендеринг. Хук = логіка. Хелпер = чисті функції.
4. **Нові файли використовують `<Icon />`** з shared замість локальних `const ico`.
5. **Емоджі в UI заборонені** — тільки SVG-іконки.
6. **Дропдауни заборонені** — тільки модалки на все вікно.
7. **Єдиний API-шлюз** — нові REST-ендпоїнти в `api-dev/`, не в інших воркерах.
8. **Блок-дефінції** — компактний запис через хелпери (`block()`, `s()`, `n()`, `b()`, `e()`), не JSON-схеми.
9. **Не роби `SELECT *`** на таблицях з важкими JSON-колонками.
10. **Не змішуй prod/dev** — різні `database_id` в `wrangler.toml`.
11. **Нативні `alert` / `confirm` / `prompt` заборонені** — у Telegram Mini App на iOS вони не працюють. Використовуй `useDialog()` з `@wwwuabot/ui/dialog` (`AGENTS.md` §4).
12. **Спільний код => спільний CSS.** Якщо клас рендерить `packages/ui`, його стилі живуть у `packages/shared/src/styles/`, а не в `index.css` однієї з оболонок — інакше в другій оболонці він буде без стилів.
13. **Мобільний — перший.** Перевіряй на 360px до десктопа: резинова верстка, `100dvh`, `var(--safe-*)`, тап-таргети ≥44px, афорданси без `:hover` (`AGENTS.md` §3).
14. **Клас без правила — це помилка, а не стиль.** Якщо клас потрібен у розмітці — спочатку додай правило в `packages/shared/src/styles/components.css`. `class="wb-mt-3"` без `.wb-mt-3` не ламає ні збірку, ні тести: відступ просто не з'явиться (так знайдено 44 класи `wb-block-*` без стилів).

---

## Структура воркспейсів

| Папка | Призначення | Стек |
|---|---|---|
| `bot-dev/` | Telegram-бот | grammY, D1, Queues |
| `api-dev/` | REST API | D1, KV, власний router (`src/router.ts`) |
| `web-platform-dev/` | Telegram Mini App | React 19, Vite 8, Tailwind 4 |
| `web-admin-dev/` | Адмін-панель | React 19, Vite 8, Page Builder |
| `packages/shared/` | Спільні типи/утиліти | TypeScript |
| `packages/ui/` | Спільні UI-компоненти | React 19 |
| `docs/` | Документація | Markdown |

---

## Додавання нового блоку Page Builder

1. Створити компонент у `packages/ui/src/blocks/NewBlock.tsx`
2. Додати запис у `BLOCK_DEFINITIONS` через хелпери (`packages/shared/src/constants/block-definitions/`)
3. Зареєструвати в `registerAllBlocks()` (`packages/ui/src/blocks/index.ts`)

---

## Додавання нового типу кнопки

1. Додати до `ButtonKind` у `web-admin-dev/src/features/scenarios/keyboard/types.ts`
2. Оновити `toTelegramButton()` / `fromTelegramButton()` у `keyboard.utils.ts`
3. Додати опцію в `KeyboardEditor.tsx`
4. Оновити `validateButtons()`

---

## Додавання нового спільного коду (чек-ліст)

1. Чи є ця функція в іншому воркері? → Використовуй, не копіюй.
2. Чи специфічна для одного воркера? → Не внось в shared.
3. Потрібна в 2+ воркерах? → Клади в `packages/shared/`.
4. Додай типи та JSDoc.
5. Онови AGENTS.md при новій конвенції.

---

## Документація

| Файл | Для кого |
|---|---|
| `AGENTS.md` | AI-агенти: архітектура, терміни, правила |
| `CONTRIBUTING.md` | Розробники: процес, quality gates, конвенції |
| **`docs/README.md`** | **покажчик усієї документації — почни звідси** |
| `docs/CONSOLIDATION_PLAN.md` | Поточний стан (§0), правила (§1), план робіт (§3), відкриті рішення (§4) |
| `docs/QUALITY_GATE.md` | Планка в CI: чотири правила, леджер боргу |
| `docs/log/` | Архів: як ухвалювались рішення (покажчик — `docs/CONSOLIDATION_LOG.md`) |
| `CHANGELOG.md` | немає — історія в `git log` і `docs/log/` |
