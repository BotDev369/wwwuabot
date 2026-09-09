# WWWUABOT

> Модульна Telegram-платформа: бот + Web Mini App + конструктор сайтів (Page Builder).

[![CI/CD](https://github.com/BotDev369/wwwuabot/actions/workflows/deploy.yml/badge.svg)](https://github.com/BotDev369/wwwuabot/actions/workflows/deploy.yml)
[![Tests](https://img.shields.io/badge/tests-44%20passing-success.svg)](vitest.config.ts)
[![TypeScript](https://img.shields.io/badge/typescript-0%20any-blue.svg)](packages/shared/)
[![License](https://img.shields.io/badge/license-AGPL%20v3-blue.svg)](LICENSE)

---

## Архітектура

npm workspaces монорепо з 4 Cloudflare Workers:

| Сервіс | Стек | Роль |
|---|---|---|
| `bot-dev/` | grammY, D1, Queues | Telegram-бот, сценарії |
| `api-dev/` | D1, KV, Hono-like router | REST API, бізнес-логіка |
| `web-platform-dev/` | React 19, Vite 8, Tailwind 4 | Telegram Mini App |
| `web-admin-dev/` | React 19, Vite 8, Page Builder | Адмін-панель |
| `packages/shared/` | TypeScript | Спільні типи, утиліти |
| `packages/ui/` | React 19 | Бібліотека блоків Page Builder |

---

## Швидкий старт

```bash
git clone https://github.com/BotDev369/wwwuabot.git && cd wwwuabot
npm install
npm test                  # 44 unit-тестів
npm run typecheck         # TypeScript strict
npm run lint              # ESLint
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

---

## CI/CD

Деплой автоматичний при пуші в `main` через GitHub Actions з path filtering — деплоїться лише змінений воркер.

---

## Ліцензія

[GNU AGPL v3](LICENSE) — похідні проекти зобов'язані залишатись open source.
