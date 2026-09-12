# WWWUABOT

> Модульна Telegram-платформа: бот + Web Mini App + конструктор сайтів (Page Builder).

[![CI/CD](https://github.com/BotDev369/wwwuabot/actions/workflows/deploy.yml/badge.svg)](https://github.com/BotDev369/wwwuabot/actions/workflows/deploy.yml)
[![Tests](https://img.shields.io/badge/tests-182%20passing-success.svg)](vitest.config.ts)
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
| `packages/shared/` | TypeScript | Спільні типи, утиліти |
| `packages/ui/` | React 19 | Бібліотека блоків Page Builder |

`api-dev` не використовує веб-фреймворк: маршрутизація — це розбір `pathname` у
`api-dev/src/router.ts` (376 рядків) плюс контролери в `src/controllers/`. Це свідомо:
залежностей менше, а кожен маршрут видно в одному файлі.

### Стан на 12.09.2026

Задеплоєні **лише дев-воркери** (`bot-dev`, `api-dev`, `web-platform-dev`,
`web-admin-dev`, БД `wwwuabot-db-dev`). **Прода немає і він ніколи не деплоївся** —
тому в коді всюди `ENVIRONMENT = "dev"`, а слово «прод» у документах означає
майбутній деплой, а не поточний стан. Прод вмикається **конфігом**, а не правками
логіки: рішення «це прод?» приймає рівно одна функція `isProduction()` з
`packages/shared/src/config/environment.ts`.

---

## Швидкий старт

```bash
git clone https://github.com/BotDev369/wwwuabot.git && cd wwwuabot
npm install
npm test                  # 182 unit-тести
npm run typecheck         # TypeScript strict
npm run lint              # ESLint
npm run format:check      # Prettier (той самий гейт, що в CI)
npm run dev --workspace=bot-dev          # Запуск бота
npm run dev --workspace=api-dev          # Запуск API
npm run dev --workspace=web-platform-dev # Web Mini App
npm run dev --workspace=web-admin-dev    # Адмін-панель
```

---

## Документація

- [AGENTS.md](AGENTS.md) — архітектура, доменні терміни, правила для AI-агентів
- [CONTRIBUTING.md](CONTRIBUTING.md) — правила розробки, quality gates, конвенції
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — CSS-токени, компоненти, `<Icon />`
- [docs/PAGE_ENGINE_ARCHITECTURE.md](docs/PAGE_ENGINE_ARCHITECTURE.md) — архітектурне рішення: єдиний Page Engine & безпека воркерів
- [docs/CONSOLIDATION_PLAN.md](docs/CONSOLIDATION_PLAN.md) — актуальний план робіт (§9), журнал виконаного (§10), знайдені ризики (§5)
- [docs/SITES_SPEC.md](docs/SITES_SPEC.md) — специфікація конструктора сайтів: D1, API, роути, чек-ліст фаз
- [docs/MONITORING.md](docs/MONITORING.md) — health-ендпоїнти, UptimeRobot, Sentry, що робити при падінні

---

## CI/CD

Деплой автоматичний при пуші в `main` через GitHub Actions з path filtering — деплоїться лише змінений воркер.

Перед деплоєм обов'язкові гейти (будь-який збій блокує весь деплой):

| Гейт | Що ловить |
|---|---|
| `npm ci` | розсинхрон `package.json` і lockfile — збірка перестала бути відтворюваною |
| `npm audit --audit-level=critical` | критичні CVE у залежностях |
| `npm run lint` | помилки ESLint |
| `npm run typecheck` | помилки типів (CI раніше блокувався 11 з них) |
| `npx prettier --check .` | розсинхрон форматування — щоб «форматування» не ставало окремою темою в ревʼю |
| `npm test` | 182 unit-тести |

Ті самі гейти виконуються на кожен pull request. Деплої воркерів не перекриваються: `concurrency` ставить їх у чергу, щоб старіший коміт не ліг поверх новішого.

---

## Ліцензія

[GNU AGPL v3](LICENSE) — похідні проекти зобов'язані залишатись open source.
