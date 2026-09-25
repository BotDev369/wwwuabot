# Ендпоїнти API

> **Згенеровано** — не правити руками: `npm run doc:api` (`scripts/doc-api.mjs`) читає
> роутер `api-dev/src/router.ts` і модулі шляхів `api-dev/src/routes/`. Гейт `check:docs` падає,
> якщо цей файл розійшовся з кодом, тож список застаріти не може.

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
| `ANY` | `/api/shop/media/<…>` | `handleShopMediaFile` |
| `GET` | `/api/space/ads` | `handleSpaceAds` |
| `GET` | `/api/space/pages` | `handleSpacePages` |
| `POST` | `/api/space/shop/orders` | `handleSpaceShopOrders` |
| `GET` | `/api/space/shop/products` | `handleSpaceShopProducts` |
| `GET` | `/api/space/themes` | `handleSpaceThemes` |
| `GET` | `/api/space/users` | `handleSpaceUsers` |
| `GET` | `/api/space/users/<…>` | `handleSpaceUser` |
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
| `POST` | `/api/user/about` | `handleUserAbout` |
| `ANY` | `/api/user/ads` | `handleUserAds` |
| `ANY` | `/api/user/pages` | `handleUserPages` |
| `GET` | `/api/user/profile` | `handleUserProfile` |
| `ANY` | `/api/user/shop/media` | `handleUserShopMedia` |
| `ANY` | `/api/user/shop/orders` | `handleUserShopOrders` |
| `ANY` | `/api/user/shop/orders/status` | `handleUserShopOrders` |
| `ANY` | `/api/user/shop/products` | `handleUserShopProducts` |
| `GET` | `/api/user/shop/statuses` | `handleUserShopStatuses` |
| `ANY` | `/api/user/themes` | `handleUserThemes` |
| `POST` | `/api/user/username` | `handleSetPlatformUsername` |
| `POST` | `/api/user/visibility` | `handleUserVisibility` |

## Адмін — cookie `admin_session`

| Метод | Шлях | Обробник |
|---|---|---|
| `POST` | `/api/admin/monitoring/collect` | `handleMonitoringCollect` |
| `GET` | `/api/admin/monitoring/summary` | `handleMonitoringSummary` |
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

Усього шляхів: **63**.
