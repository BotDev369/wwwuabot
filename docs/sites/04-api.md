<!-- §5–§6: API-ендпоїнти, статуси публікації -->
> **Частина специфікації `SITES_SPEC`.** Покажчик розділів — [`docs/SITES_SPEC.md`](../SITES_SPEC.md).

## 5. API ендпоїнти (api-dev)

### 5.1. Sites (користувач)

| Метод | Маршрут | Опис |
|---|---|---|
| `POST` | `/api/sites` | Створити сайт (повертає id) |
| `GET` | `/api/sites` | Мої сайти (owner_id з auth) |
| `GET` | `/api/sites/:slug` | Отримати сайт |
| `PUT` | `/api/sites/:slug` | Оновити (title, settings, is_public) |
| `DELETE` | `/api/sites/:slug` | Видалити сайт |
| `POST` | `/api/sites/:slug/publish` | Подати на модерацію (status → pending) |
| `POST` | `/api/sites/:slug/unpublish` | Зняти з публікації (→ draft) |

### 5.2. Site Pages

| Метод | Маршрут | Опис |
|---|---|---|
| `POST` | `/api/sites/:slug/pages` | Створити сторінку |
| `GET` | `/api/sites/:slug/pages` | Всі сторінки сайту |
| `PUT` | `/api/sites/:slug/pages/:pid` | Оновити сторінку |
| `DELETE` | `/api/sites/:slug/pages/:pid` | Видалити сторінку |
| `POST` | `/api/sites/:slug/pages/:pid/publish` | Опублікувати сторінку |

### 5.3. Templates

| Метод | Маршрут | Опис |
|---|---|---|
| `GET` | `/api/templates` | Список (system + мої) |
| `GET` | `/api/templates/:id` | Отримати шаблон |
| `POST` | `/api/templates` | Створити шаблон (user) |
| `PUT` | `/api/templates/:id` | Оновити (тільки свої) |
| `DELETE` | `/api/templates/:id` | Видалити (тільки свої, не system) |

### 5.4. Catalog (публічний)

| Метод | Маршрут | Опис |
|---|---|---|
| `GET` | `/api/catalog` | Опубліковані сайти (pagination) |
| `GET` | `/api/catalog/:slug` | Сайт з каталогу |

### 5.5. Admin Moderation

| Метод | Маршрут | Опис |
|---|---|---|
| `GET` | `/api/admin/sites/pending` | Черга модерації |
| `GET` | `/api/admin/sites` | Всі сайти (з фільтрами) |
| `POST` | `/api/admin/sites/:slug/approve` | Схвалити публікацію |
| `POST` | `/api/admin/sites/:slug/reject` | Відхилити (з причиною) |
| `POST` | `/api/admin/templates` | Створити system шаблон |
| `DELETE` | `/api/admin/templates/:id` | Видалити шаблон |

---

## 6. Статуси публікації

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   DRAFT     │────►│   PENDING   │────►│  PUBLISHED  │
│  (created)  │     │  (submit)   │     │  (approved) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  REJECTED   │────► (back to DRAFT)
                    │  (denied)   │
                    └─────────────┘
```

| Статус | Хто бачить | Що можна |
|---|---|---|
| `draft` | Owner + Admin | Редагувати, видаляти, подавати на модерацію |
| `pending` | Owner + Admin | Чекати, зняти з модерації |
| `published` | Всі | Переглядати (public access) |
| `rejected` | Owner + Admin | Редагувати, подавати знову |

---

