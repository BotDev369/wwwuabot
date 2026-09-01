# WWWUABOT [v:1.1]

Багатофункціональний проект: Telegram-бот + веб-платформа з модульною архітектурою.

## 📁 Структура проекту (Monorepo — 4 Cloudflare Workers)

```
wwwuabot/
├── bot/            # 🤖 Telegram-бот (grammY + D1 + Queues + Cloudinary)
│   ├── src/        #   код бота (middleware, router, actions, modules)
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── api/            # 📡 REST API Worker (калькулятори, CRUD, аналітика)
│   ├── src/        #   router.ts + controllers/ + shared/
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── web/            # 🌐 Telegram Mini App (React 19 + Vite 8 + Tailwind 4)
│   ├── src/        #   app/ layout/ pages/ shared/ stores/
│   ├── wrangler.toml
│   └── package.json
│
├── web-admin/      # 🖥️ Адмін-панель (React 19 + Vite 8 + Tailwind 4 + Zustand)
│   ├── src/        #   app/ layout/ pages/ features/ shared/
│   ├── wrangler.toml
│   └── package.json
│
├── packages/       # Спільний код (npm workspace)
│   └── shared/     # Дизайн-система, утиліти, типи
│
└── public docs/    # AUDIT.md, PROJECT_PLAN.md, SCORECARD.md
```

## 🚀 Технології

| Компонент | Стек |
|-----------|------|
| **Bot** | TypeScript, grammY, Cloudflare Workers, D1 (SQLite), Cloudflare Queues, Cloudinary |
| **API** | TypeScript, Cloudflare Workers, D1, KV (кеш), router + controllers |
| **Web (TWA)** | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Zustand 5, React Router 7 |
| **Web Admin** | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Zustand 5, React Router 7 |
| **Shared** | CSS design tokens, light/dark themes, ThemeToggle component |

### Єдиний стек web/web-admin (оновлено 28.08.2026)

web і web-admin мають **100% ідентичний стек** та архітектуру src/:

| Параметр | Версія |
|---|---|
| React | 19.2 |
| Vite | 8.1 |
| TypeScript | 6.0 |
| Tailwind CSS | 4.3 |
| Zustand | 5.0 |
| React Router | 7.18 (`createBrowserRouter`) |
| `@cloudflare/vite-plugin` | 1.45 |
| ESLint | flat config |

## 🏗️ Архітектура

Кожен компонент — окремий Cloudflare Worker зі своїм `wrangler.toml` та `package.json`.

### Зв'язки між воркерами:
```
Telegram Bot API
      │
      ▼
   ┌──────┐     webhook      ┌──────────┐
   │ Bot  │ ◄──────────────── │ Telegram │
   │      │                   └──────────┘
   └──┬───┘
      │ D1 (users, scenarios, settings)
      │
      ▼
   ┌──────┐     D1 + KV      ┌──────────┐
   │ API  │ ◄──────────────── │   Web    │
   │      │   (service bind)  │  (TWA)   │
   └──────┘                   └──────────┘
      ▲
      │ D1 + KV
   ┌──────────┐
   │Web Admin │
   │ (CMS)    │
   └──────────┘
```

### Архітектура src/ (web та web-admin):
```
src/
├── App.tsx              # RouterProvider wrapper
├── main.tsx             # Entry point (StrictMode + theme init)
├── index.css            # Tailwind + shared design system
├── worker.ts            # Cloudflare Worker
├── app/                 # AuthGate + router
├── layout/              # AppShell, Sidebar, Header, Footer
├── pages/               # Page components
├── shared/api/          # Typed API functions
├── stores/              # Zustand stores
└── features/            # (web-admin) Domain features
```

### Ключові концепції:
- **Scenario** — контентна одиниця (екран бота з кнопками, підписом, фото)
- **Family Box** — JSON-стан користувача в колонках D1 (кошик, дати, ігри)
- **Rich Message** — block-based повідомлення через Telegram Bot API
- **Forum Topics** — нотифікації в Telegram Groups з розділенням по темах

## 🏗️ Запуск локально

```bash
# Встановлення залежностей
npm install

# Bot
cd bot && npm run dev

# API
cd api && npm run dev

# Web (TWA)
cd web && npm run dev

# Web Admin
cd web-admin && npm run dev
```

### Змінні оточення (назви, не значення):

| Змінна | Де використовується | Призначення |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | CI/CD | Токен API Cloudflare для деплою |
| `CLOUDFLARE_ACCOUNT_ID` | CI/CD | ID акаунту Cloudflare |
| `ADMIN_SECRET` | web-admin | Пароль для входу в адмінку |
| `BOT_TOKEN` | web-admin | Telegram Bot API token (для відправки повідомлень) |

## 🚀 Деплой

Деплой відбувається автоматично через GitHub Actions при пуші в `main`.
Деплоїться лише змінений воркер (path filtering).

```bash
# Деплой конкретного воркера на dev
cd web && npm run deploy:dev
cd web-admin && npm run deploy:dev
cd bot && npm run deploy:dev
cd api && npm run deploy:dev
```

## 📄 Ліцензія

Проєкт ліцензовано за [GNU AGPL v3](LICENSE). Будь-які похідні проєкти зобов'язані залишатись відкритими під тією ж ліцензією.

## 📞 Контакти

Репозиторій: https://github.com/BotDev369/wwwuabot


## 🤖 AI Agent Integration
*01.09.2026 — Qwen AI Agent successfully connected and tested direct push to `main`.*
