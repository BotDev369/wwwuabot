# WWWUA Bot

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

## 📦 Встановлення та запуск

### Загальні вимоги
- Node.js >= 18
- npm >= 9

### 1. Адмін-панель (`admin/`)

```bash
cd admin
npm install
npm run dev
```

**Збірка для продакшену:**
```bash
npm run build
```

### 2. API модуль (`api/`)

```bash
cd api
npm install
npm run dev
```

### 3. Telegram-бот (`src/`)

```bash
npm install
npm run dev
```

### 4. Веб-інтерфейс (`web/`)

```bash
cd web
npm install
npm run dev
```

**Збірка для Cloudflare Workers:**
```bash
npm run build
```

**Деплой на Cloudflare:**
```bash
# Dev середовище
npx wrangler deploy --env dev

# Production середовище
npx wrangler deploy --env production
```

## 🔧 Конфігурація

### Змінні оточення

Створіть файл `.env` у відповідних директоріях з необхідними змінними:

- `TELEGRAM_BOT_TOKEN` - токен вашого Telegram-бота
- `CLOUDFLARE_API_TOKEN` - токен для доступу до Cloudflare
- Інші специфічні змінні для кожного модуля

## 🌐 Маршрути веб-інтерфейсу

- `/` - Головна сторінка
- `/galyashop/*` - Модуль GalyaShop
- `/mydate/*` - Модуль MyDate
- `/ttt/*` - Модуль TTT (Tic-Tac-Toe)

## 🏗️ Архітектура

Проект побудований за модульним принципом:
- **UI Kit** - базові компоненти інтерфейсу
- **Slot System** - динамічне рендеринг компонентів
- **Fallback Components** - обробка станів (помилки, порожні стани, авторизація)

## 📝 Розробка

Для розробки всіх модулів одночасно рекомендується відкривати термінал для кожної директорії окремо.

## 🤝 Внесок у проект

1. Fork репозиторій
2. Створіть feature гілку (`git checkout -b feature/amazing-feature`)
3. Commit зміни (`git commit -m 'Add amazing feature'`)
4. Push до гілки (`git push origin feature/amazing-feature`)
5. Відкрийте Pull Request

## 📄 Ліцензія

Цей проект є власністю BotDev369.

## 📞 Контакти

Репозиторій: https://github.com/BotDev369/wwwuabot
