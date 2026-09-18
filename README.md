# WWWUABOT

> Модульна Telegram-платформа: бот + Web Mini App + Page Builder.
>
> Контент живе в **одному** місці — таблиця `scenarios`: рядок = сторінка вебу
> (`page_data`) разом із її поданням у боті (`caption_*`, `buttons`, `rich_*`).

[![CI/CD](https://github.com/BotDev369/wwwuabot/actions/workflows/deploy.yml/badge.svg)](https://github.com/BotDev369/wwwuabot/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/typescript-0%20any-blue.svg)](packages/shared/)
[![License](https://img.shields.io/badge/license-AGPL%20v3-blue.svg)](LICENSE)

---

## Архітектура

npm workspaces монорепо з 4 Cloudflare Workers:

| Сервіс | Стек | Роль |
|---|---|---|
| `bot-dev/` | grammY, D1, Queues | Telegram-бот, сценарії |
| `api-dev/` | D1, KV, власний router | REST API, бізнес-логіка |
| `web-platform-dev/` | React 19, Vite 8, Tailwind 4 | Telegram Mini App |
| `web-admin-dev/` | React 19, Vite 8, Page Builder | Адмін-панель |
| `packages/shared/` | TypeScript | Спільні типи, утиліти, дизайн-токени |
| `packages/ui/` | React 19 | Блоки Page Builder і спільні кирпичики |

`api-dev` не використовує веб-фреймворк: маршрутизація — це розбір `pathname` у
`api-dev/src/router.ts` плюс контролери в `src/controllers/`. Це свідомо: залежностей менше, а
кожен шлях видно в одному файлі. `web` і `web-admin` — тонкі оболонки: до D1 не ходить жоден із
них, усі дані йдуть через `api-dev`.

**Середовища:** задеплоєні лише дев-воркери. Прода немає, і прод вмикається **конфігом**, а не
правками логіки — рішення «це прод?» приймає рівно одна функція `isProduction()`
(`packages/shared/src/config/environment.ts`).

---

## Швидкий старт

```bash
git clone https://github.com/BotDev369/wwwuabot.git && cd wwwuabot
npm install
npm test                  # Vitest
npm run typecheck         # TypeScript strict, 0 any
npm run lint              # ESLint
npm run format:check      # Prettier (той самий гейт, що в CI)
npm run dev --workspace=bot-dev          # Запуск бота
npm run dev --workspace=api-dev          # Запуск API
npm run dev --workspace=web-platform-dev # Web Mini App
npm run dev --workspace=web-admin-dev    # Адмін-панель
```

---

## Документація

- **[docs/README.md](docs/README.md)** — **покажчик усієї документації**: один документ = одна тема
  = один власник факту, бюджет розміру й таблиця «куди писати нове»
- [AGENTS.md](AGENTS.md) — архітектура, доменні терміни, правила для AI-агентів
- [docs/RECIPES.md](docs/RECIPES.md) — покрокові рецепти типових задач
- [CONTRIBUTING.md](CONTRIBUTING.md) — правила розробки, quality gates, конвенції
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — токени й правила вигляду
- [docs/API.md](docs/API.md) — усі шляхи `api-dev` із групами доступу (генерований)
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) · [docs/CONTENT_MODEL.md](docs/CONTENT_MODEL.md) — схема D1 і модель контенту
- [docs/QUALITY_GATE.md](docs/QUALITY_GATE.md) · [docs/MONITORING.md](docs/MONITORING.md) — планка в CI і моніторинг
- [bot-dev/README.md](bot-dev/README.md) — бот як система: конвеєр апдейта, екрани, нотифікації

Виміряних чисел (файли, рядки, тести, класи) в документах немає — їх друкують самі гейти
(`npm run check:css` / `check:docs` / `check:quality` / `npm test`) і вони старіють швидше, ніж їх
перечитують.

---

## CI/CD

Деплой автоматичний при пуші в `main` через GitHub Actions з path filtering — деплоїться лише
змінений воркер.

Перед деплоєм обов'язкові гейти (будь-який збій блокує весь деплой):

| Гейт | Що ловить |
|---|---|
| `npm ci` | розсинхрон `package.json` і lockfile — збірка перестала бути відтворюваною |
| `npm audit --audit-level=high` | уразливості залежностей |
| `npm run lint` | помилки ESLint, `any` |
| `npm run typecheck` | помилки типів у всіх воркспейсах |
| `npx prettier --check .` | розсинхрон форматування |
| `npm run check:css` | клас без правила: спільний код стилізований у `shared`, клас оболонки має правило |
| `npm run check:quality` | ліміт рядків на файл, нативні діалоги, голий `100vh`, емодзі в UI |
| `npm run check:docs` | бюджет документа, мертві посилання й шляхи, свіжість `docs/API.md`, «§N» з коду без дому |
| `npm run check:db` | таблиця D1 поза реєстром `tables.ts` або друкарська помилка в її імені |
| `npm test` | регресії |

Ті самі гейти виконуються на кожен pull request. Деплої воркерів не перекриваються: `concurrency`
ставить їх у чергу, щоб старіший коміт не ліг поверх новішого.

---

## Ліцензія

[GNU AGPL v3](LICENSE) — похідні проекти зобов'язані залишатись open source.
