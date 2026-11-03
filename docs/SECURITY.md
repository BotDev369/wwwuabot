# Безпека: заголовки, CORS, ідентичність, сесія

**Власник правил безпеки.** Код — `packages/shared/src/security/` (`headers.ts`, `access.ts`,
`session.ts`, `telegram.ts`); групи доступу ендпоїнтів — [`API.md`](./API.md) (генерований).
Правило продукту: платформа **закрита за запрошеннями**, гейт стоїть в `api-dev` перед
маршрутизацією, а роль допуску нікого не підвищує.

## Заголовки — одна реалізація на всі воркери

`secureResponse(response, { url, csp })` з `packages/shared/src/security/headers.ts` —
єдине місце, де live усі три воркери. Кожен накладає її на **виході**, а не в кожному
контролері: новий шлях не може «забути» заголовки, бо точку входу одна.

| Заголовок | Значення | Чому |
|---|---|---|
| `X-Frame-Options` | `DENY` | адмінку не можна вбудувати в чужий iframe (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | браузер не вгадує тип відповіді — класичний вектор XSS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | не витікає внутрішній шлях у треті сторони |
| `Permissions-Policy` | `geolocation/microphone/camera = ()` | Mini App не потребує жодного з них |
| `Strict-Transport-Security` | `max-age=31536000` | лише на HTTPS: на `http://localhost` браузер заблокував би сервер уперше |

## CORS — не «*»

`Access-Control-Allow-Origin: *` стояв в **обох оболонках, зокрема на HTML адмінки**: будь-який
сайт міг прочитати відповідь панелі. Тепер заголовок ставиться **лише тоді, коли `Origin` запиту
збігається з origin самого запиту**, і супроводиться `Vary: Origin` — інакше кеш віддав би
відповідь із чужим заголовком. Запити без `Origin` (service binding, розклад) заголовка не
отримують: їм він не потрібен.

## CSP: три винятки, кожен із причиною

Стандартний набір (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`,
`frame-ancestors 'none'`, `form-action 'self'`) і три відхилення, які **не можна «полагодити»**:

| Відхилення | Причина |
|---|---|
| `script-src https://telegram.org` | SDK Mini App підвантажується зі Telegram в `index.html`; без нього `window.Telegram.WebApp` не існує |
| `style-src 'unsafe-inline'` | блоки Page Builder стилізуються інлайном (`style={{…}}`) — без цього їхні стилі зникли б |
| `img-src … https:` | фото людини й товару живуть у R2, URL зовнішні |

`frame-ancestors 'none'` безпечний: Telegram відкриває Mini App як **головний документ** WebView,
а не в iframe.

**Послаблення лише на localhost** (`localhost`, `127.0.0.1`, `[::1]`): Vite вставляє інлайнові
скрипти react-refresh і HMR, тож строгий CSP зламав би дев-сервер. Без `url` береться **строгий**
варіант: незнання середовища — не привід послабити політику.

## Ідентичність і доступ

- Людина — **лише з підписаного `initData`** (`packages/shared/src/security/telegram.ts`).
  `user_id` з тіла, заголовка чи cookie не приймається: `api-dev/src/shared/identity.ts`.
- **Адмін — cookie `admin_session`**, HMAC-підпис; секрет у заголовку заборонений (тече в логи й
  ретраї, не відкликається окремо від пароля). Розбір — `packages/shared/src/security/session.ts`.
- Перевірка доступу — **чиста функція** в `packages/shared/src/security/access.ts`; що робити при
  провалі — виклик. Гейт стоїть у `api-dev/src/router.ts` перед маршрутизацією.

## Що гейт ловить, а що — ні

Тести (`headers.test.ts`, `access.test.ts`, `session.test.ts`, `telegram.test.ts`) тримають заголовки,
CORS і підпис. **Не ловиться** нічого, що потребує живого браузера: реальний релой у Telegram WebView
на iOS, клікджекінг із боку Telegram, XSS через `innerHTML` у контенті сторінок. Для цього потрібен
браузерний тест, а `jsdom` його не замінює.

## Стережить

`npm test` (тести заголовків), `npm run check:docs` (посилання на цей документ).