# WWWUA Bot (v:1.0)

Багатофункціональний Telegram-бот та веб-платформа з модульною архітектурою.

## 📁 Структура проекту

```
wwwuabot/
├── admin/          # Адмін-панель (React + TypeScript + Vite)
├── api/            # API модуль для бота
├── src/            # Основний код Telegram-бота
├── web/            # Веб-інтерфейс (React + Vite + Cloudflare Workers)
├── package.json    # Кореневі налаштування проекту
├── tsconfig.json   # TypeScript конфігурація
└── wrangler.toml   # Cloudflare Workers конфігурація
```

## 🚀 Технології

- **Frontend**: React 18, TypeScript, Vite, React Router DOM
- **Backend**: Cloudflare Workers, Wrangler
- **Bot**: Telegram Bot API
- **Build Tools**: npm, TypeScript, Vite

## 🏗️ Архітектура

Проект побудований за модульним принципом:
- **UI Kit** - базові компоненти інтерфейсу
- **Slot System** - динамічне рендеринг компонентів
- **Fallback Components** - обробка станів (помилки, порожні стани, авторизація)

## 📄 Ліцензія

Цей проект є власністю BotDev369.

## 📞 Контакти

Репозиторій: https://github.com/BotDev369/wwwuabot
