# Ендпоїнти API

> **Згенеровано** — не правити руками: `npm run doc:api` (`scripts/doc-api.mjs`) читає
> `api-dev/src/router.ts`. Гейт `check:docs` падає, якщо цей файл розійшовся з кодом, тож
> список застаріти не може.

Кожен шлях належить рівно одній групі доступу, і це визначають **префікси**, а не
сам ендпоїнт: адмінські шляхи мусять бути під `/api/admin/`, `/api/portal/` або
`/api/bot/`, інакше вони проходять повз єдиний адмін-гейт (`AGENTS.md` §5, §7).
Рецепт нового ендпоїнта — `docs/RECIPES.md`.

## Публічне — без авторизації

| Метод | Шлях | Обробник |
|---|---|---|
| `ANY` | `/api/mydate/analysis/<…>` | `handleAnalysisRead` |
| `POST` | `/api/mydate/analyze` | `handleAnalyze` |
| `POST` | `/api/mydate/compare` | `handleCompare` |
| `ANY` | `/api/mydate/systems` | `handleSystems` |
| `ANY` | `/api/scenario/<…>` | `handleScenario` |
| `ANY` | `/health` | `handleHealth` |
| `ANY` | `/health/deep` | `handleDeepHealth` |

## Користувач — підписаний Telegram `initData`

| Метод | Шлях | Обробник |
|---|---|---|
| `ANY` | `/api/contacts` | `handleContacts` |
| `POST` | `/api/contacts/link` | `handleContactLink` |
| `ANY` | `/api/messages` | `handleMessages` |
| `GET` | `/api/messages/badge` | `handleMessageBadge` |
| `POST` | `/api/messages/clear` | `handleMessageClear` |
| `GET` | `/api/messages/compose` | `handleMessageCompose` |
| `POST` | `/api/messages/delete` | `handleMessageDelete` |
| `POST` | `/api/messages/draft` | `handleMessageDraft` |
| `POST` | `/api/messages/read` | `handleMessageRead` |
| `POST` | `/api/messages/send` | `handleMessageSend` |
| `ANY` | `/api/messages/thread` | `handleMessageThread` |
| `ANY` | `/api/my-dates` | `handleMyDates` |
| `ANY` | `/api/notes` | `handleNotes` |
| `GET` | `/api/user/profile` | `handleUserProfile` |
| `POST` | `/api/user/username` | `handleSetPlatformUsername` |

## Адмін — cookie `admin_session`

| Метод | Шлях | Обробник |
|---|---|---|
| `ANY` | `/api/admin/notes` | `handleAdminNotes` |
| `POST` | `/api/admin/users/block` | `handleBlockUser` |
| `POST` | `/api/admin/users/bulk` | `handleBulkUsers` |
| `POST` | `/api/admin/users/delete` | `handleDeleteUser` |
| `GET` | `/api/admin/users/list` | `handleListUsers` |
| `POST` | `/api/admin/users/message` | `handleUserMessage` |
| `POST` | `/api/admin/users/read` | `handleReadUser` |
| `POST` | `/api/admin/users/update` | `handleUpdateUser` |
| `POST` | `/api/bot/delete-webhook` | `handleDeleteWebhook` |
| `GET` | `/api/bot/info` | `handleBotInfo` |
| `POST` | `/api/bot/setup-webhook` | `handleBotSetupWebhook` |
| `GET` | `/api/bot/webhook-info` | `handleBotWebhookInfo` |
| `POST` | `/api/portal/scenarios/delete` | `handlePortalDelete` |
| `GET` | `/api/portal/scenarios/list` | `handlePortalList` |
| `POST` | `/api/portal/scenarios/read` | `handlePortalRead` |
| `POST` | `/api/portal/scenarios/read-all` | `handlePortalReadAll` |
| `POST` | `/api/portal/scenarios/update` | `handlePortalUpdate` |
| `POST` | `/api/portal/scenarios/write` | `handlePortalWrite` |

## Сесія адміна — ставить або знімає cookie

| Метод | Шлях | Обробник |
|---|---|---|
| `ANY` | `/auth/check` | `handleCookieAuthCheck` |
| `POST` | `/auth/login` | `handleLogin` |
| `POST` | `/auth/logout` | `handleLogout` |

Усього шляхів: **43**.
