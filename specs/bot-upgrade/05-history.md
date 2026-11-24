# 05. Історія повідомлень, «очистити історію», адмін-правка

## 5.1 Append-only і реєстр

| Що | Стан | Факт |
|---|---|---|
| Бот не редагує й не видаляє у звичайному потоці | ✅ | пошук, `/start`, `/words` — завжди `sendRichMessage` новим повідомленням |
| Один реєстр обох боків | ✅ | `bot_messages`: `user_id`, `chat_id`, `direction` (`in`/`out`), `message_id`, `kind` (`text`/`command`/`photo`/`rich`/`sticker`/`other`), `text` (до 4096), `meta` (JSON), `created_at`/`edited_at`/`deleted_at` — [`bot-messages.ts`](../../packages/shared/src/database/bot-messages.ts), DDL — [`tables.ts`](../../packages/shared/src/database/tables.ts) |
| Запис вхідних | ✅ | [`record.ts:18`](../../bot-dev/src/modules/history/record.ts) — у роутері, **після** блокувань і ліміту, тож відкинуте в історію не потрапляє |
| Запис вихідних | ✅ | `recordOutgoingMessage` там само; номер береться з відповіді Telegram |
| Помилка запису не ламає відповідь | ✅ | обидва записи в `try/catch` з логом |
| `users.message_id` як «останній екран» | 🟡 легасі | колонка ще існує й використовується віджетним шляхом ([`widget-query.ts`](../../bot-dev/src/core/widget-query.ts)); у новому потоці не потрібна |

## 5.2 «Очистити історію» — треба додати

Місія: людина сама прибирає свою переписку через **меню-кнопку зліва від поля вводу**. Зараз:

- `setChatMenuButton` у коді **немає** — бот жодного разу не ставить меню;
- сторінки `/menu` у реєстрі екранів платформи **немає**.

**Рішення.** MenuButton веде на Mini App `…/menu` — звичайна сторінка застосунку, не чат. Пункти:
«Про платформу», «Контакти», «Мої замовлення», **«Очистити історію»**. «Очистити» викликає
`POST /api/user/bot-history/clear`, а той — підписаний канал до бота (5.3): бот видаляє те, що ще
може (до 48 годин), решту позначає `deleted_at`, і історія в адмінці лишається архівом
(❗ [питання 4](./07-questions.md)).

Те саме меню потрібне й для «Про платформу»/«Контакти» — зараз ці тексти живуть тільки в акордеонах
`/start`.

## 5.3 Адмін: читання, правка, видалення

| Що | Стан | Факт |
|---|---|---|
| Читання переписки | ✅ | `GET /api/admin/users/:id/messages` — [`bot-messages.controller.ts`](../../api-dev/src/controllers/bot-messages.controller.ts); курсор назад, без стрибків |
| UI: 6 останніх + «ще 6» | ✅ | [`UserChatModal.tsx`](../../web-admin-dev/src/pages/users/UserChatModal.tsx), [`useUserChat.ts`](../../web-admin-dev/src/pages/users/useUserChat.ts) |
| Переходи «користувач ⇄ переписка» | ✅ | `UserMessageModal.tsx` і картка користувача в `/users` |
| Правка | ✅ | **лише** повідомлення бота (`direction = 'out'`); чужі — відмова; адмінська правка стає новим rich-екраном (`plainTextToRichHtml`) |
| Видалення | ✅ | будь-яке повідомлення **до 48 годин**; після — чесна відмова словами, без запиту в Telegram ([`admin-actions.ts`](../../bot-dev/src/modules/history/admin-actions.ts), [`bot-message-expired`](../../packages/shared/src/database/bot-messages.ts)) |
| Два факти в одному місці | ✅ | `edited_at`/`deleted_at` ставиться **після** `ok` від Telegram, а не до |
| Канал `api-dev → bot` | ✅ | service binding `BOT` ([`api-dev/wrangler.toml`](../../api-dev/wrangler.toml)) + HMAC-підпис метод+шлях+час+тіло, TTL 60 с ([`bot-channel.ts`](../../packages/shared/src/security/bot-channel.ts)) |

**Чому 48 годин, а не «скільки завгодно».** Це межа самого Telegram: після неї `editMessageText` і
`deleteMessage` відмовляють. Тому перевірка стоїть **до** мережі — людина бачить причину, а не
помилку API.
