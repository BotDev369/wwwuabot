# WWWUABOT [v:1.0]

Багатофункціональний Telegram-бот та веб-платформа з модульною архітектурою.

## 📁 Структура проекту (Monorepo — 4 Cloudflare Workers)

```
wwwuabot/
├── bot/            # 🤖 Telegram-бот (grammY + D1 + Queues)
│   ├── src/        #   код бота (middleware, router, actions, modules)
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── api/            # 📡 REST API Worker (калькулятори, CRUD, аналітика)
│   ├── src/index.ts
│   └── wrangler.toml
│
├── web/            # 🌐 Telegram Mini App (React + Vite)
│   ├── src/        #   TWA: Мої дати, Аналіз, Співставлення
│   ├── wrangler.toml
│   └── package.json
│
├── web-admin/      # 🖥️ Адмін-панель (React + Vite + Tailwind + Zustand)
│   ├── src/        #   редактор сценаріїв, RichMessage Editor
│   ├── wrangler.toml
│   └── package.json
│
└── README.md
```

## 🚀 Технології

| Компонент | Стек |
|-----------|------|
| **Bot** | TypeScript, grammY, Cloudflare Workers, D1 (SQLite), Cloudflare Queues, Cloudinary |
| **API** | TypeScript, Cloudflare Workers, D1, KV (кеш) |
| **Web (TWA)** | React 18, TypeScript, Vite 5, React Router 6, Wrangler |
| **Web Admin** | React 19, TypeScript, Vite 8, Zustand, Tailwind CSS 4, React Router 7 |

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

### Ключові концепції:
- **Scenario** — контентна одиниця (екран бота з кнопками, підписом, фото)
- **Family Box** — JSON-стан користувача в колонках D1 (кошик, дати, ігри)
- **Rich Message** — block-based повідомлення через Telegram Bot API
- **Forum Topics** — нотифікації в Telegram Groups з розділенням по темах

## 📄 Ліцензія

Проєкт ліцензовано за [GNU AGPL v3](LICENSE). Будь-які похідні проєкти зобов'язані залишатись відкритими під тією ж ліцензією.

## 📞 Контакти

Репозиторій: https://github.com/BotDev369/wwwuabot
