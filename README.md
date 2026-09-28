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

**Покажчик усієї документації — [`docs/README.md`](docs/README.md)**: один документ = одна тема
= один власник факту, бюджет розміру й таблиця «куди писати нове». Найпотрібніше:

- [AGENTS.md](AGENTS.md) — архітектура, доменні терміни, правила й заборони (для AI-агентів)
- [docs/RECIPES.md](docs/RECIPES.md) — покрокові рецепти типових задач
- [CONTRIBUTING.md](CONTRIBUTING.md) — гейти перед пушем і конвенція комітів

Виміряних чисел (файли, рядки, тести, класи) в документах немає — їх друкують самі гейти
(`npm run check:css` / `check:docs` / `check:quality` / `npm test`) і вони старіють швидше, ніж їх
перечитують.

---

## CI/CD

Деплой автоматичний при пуші в `main` через GitHub Actions з path filtering — деплоїться лише
змінений воркер.

Перед деплоєм обов'язкові гейти — будь-який збій блокує **весь** деплой.

**Що саме ловить кожен гейт і як його запускати — [`docs/QUALITY_GATE.md`](docs/QUALITY_GATE.md).**

Ті самі гейти виконуються на кожен pull request. Деплої воркерів не перекриваються: `concurrency`
ставить їх у чергу, щоб старіший коміт не ліг поверх новішого.

---

## Ліцензія

[GNU AGPL v3](LICENSE) — похідні проекти зобов'язані залишатись open source.
