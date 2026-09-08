# Page Builder — Довідник усіх модулів

> **Версія:** 1.0
> **Дата створення:** 08.09.2026
> **Мета:** Єдиний стиль запису-читання JSON для всіх блоків Page Builder.
> **Джерело істини:** `packages/ui/src/blocks/*.tsx` та `packages/shared/src/types/page-config.types.ts`

---

## Загальна структура page_data

Колонка `page_data` в таблиці `scenarios` містить JSON у форматі:

```json
{
  "page_data": {
    "version": 1,
    "zones": {
      "sidebar": [],
      "header": [],
      "main": [],
      "footer": []
    },
    "visibleZones": ["main"],
    "sidebarSettings": {}
  }
}
```

### Поля page_data

| Поле | Тип | Опис |
|---|---|---|
| `version` | `number` | Завжди `1` |
| `zones` | `Record<BlockZone, PageBlock[]>` | Блоки по 4 зонах |
| `visibleZones` | `BlockZone[]?` | Зони, які користувач явно додав |
| `sidebarSettings` | `SidebarSettings?` | Налаштування сайдбару |

### Формат кожного блоку (PageBlock)

```json
{
  "id": "UUID",
  "type": "block_type",
  "name": "Optional display name",
  "order": 0,
  "props": { ... },
  "conditions": { ... },
  "children": [ ... ]
}
```

| Поле | Тип | Обов'язково | Опис |
|---|---|---|---|
| `id` | `string` | Так | UUID v4, унікальний для кожного блоку |
| `type` | `string` | Так | Ключ блоку з реєстру (див. нижче) |
| `name` | `string` | Ні | Назва для редактора (якщо не вказано — показується тип) |
| `order` | `number` | Так | Позиція в зоні (починається з 0) |
| `props` | `Record<string, unknown>` | Так | Конфігурація блоку (залежить від типу) |
| `conditions` | `BlockConditions` | Ні | Умови показу (роль/тариф/статус/знижка/permissions) |
| `children` | `PageBlock[]` | Ні | Вкладені блоки (для card, columns) |

### Блоки з children (рекурсивні)

Деякі блоки приймають вкладені блоки:
- **card** — `children` рендеряться всередині картки
- **columns** — кожна колонка може містити `children`

---

## Категорії блоків

| # | Категорія | Кількість | Опис |
|---|---|:---:|---|
| 1 | **MVP** | 5 | Базові блоки для будь-якої сторінки |
| 2 | **Content** | 6 | Розширений контент (HTML, відео, галерея) |
| 3 | **Layout** | 4 | Структура та компоновка |
| 4 | **Navigation** | 6 | Навігація та меню |
| 5 | **Data** | 4 | Дані та метрики |
| 6 | **Commerce** | 4 | Тарифи, відгуки, функції, FAQ |
| 7 | **Forms** | 3 | Поля введення |
| 8 | **Bot-domain** | 7 | Спеціалізовані блоки бота |
| 9 | **Analytics + Raw + Platform** | 3 | Графики, HTML, тема |
| | **Разом** | **42 реєстрації** | (35 унікальних + альяс-назви) |

---

## 1. MVP блоки

### 1.1. `text` — Текстовий блок

> Відображає заголовок та/або текст з налаштуванням рівня та вирівнювання.

```json
{
  "id": "3db436d4-8ab1-4661-8298-c7bfe0bc1d3e",
  "type": "text",
  "order": 0,
  "props": {
    "title": "Заголовок сторінки",
    "content": "Текст під заголовком. Підтримує переноси рядків.",
    "level": "h2",
    "align": "left"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `title` | `string` | `""` | — | Заголовок (показується якщо не порожній) |
| `content` | `string` | `""` | — | Текст під заголовком |
| `level` | `string` | `"body"` | `h1`, `h2`, `h3`, `h4`, `body` | Рівень заголовка |
| `align` | `string` | `"left"` | `left`, `center`, `right` | Вирівнювання |

---

### 1.2. `image` — Зображення

> Відображає зображення з підписом, обмеженням ширини та заокругленням.

```json
{
  "id": "a1b2c3d4-1111-2222-3333-444455556666",
  "type": "image",
  "order": 1,
  "props": {
    "src": "https://example.com/photo.jpg",
    "alt": "Опис зображення",
    "caption": "Підпис під зображенням",
    "width": "full",
    "rounded": true
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `src` | `string` | `""` | — | URL зображення (якщо порожній — не рендериться) |
| `alt` | `string` | `""` | — | Альтернативний текст |
| `caption` | `string` | `""` | — | Підпис під зображенням |
| `width` | `string` | `"full"` | `full`, `3/4`, `1/2`, `1/3`, `auto` | Обмеження ширини |
| `rounded` | `boolean` | `false` | — | Заокруглені кути |

---

### 1.3. `buttons` — Група кнопок

> Відображає групу кнопок з різними стилями.

```json
{
  "id": "b2c3d4e5-2222-3333-4444-555566667777",
  "type": "buttons",
  "order": 2,
  "props": {
    "items": [
      {
        "text": "Відкрити в Telegram",
        "url": "https://t.me/MyBot?start=home",
        "variant": "primary"
      },
      {
        "text": "Дізнатись більше",
        "url": "https://example.com",
        "variant": "secondary"
      }
    ],
    "layout": "row"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `items` | `ButtonItem[]` | `[]` | — | Масив кнопок |
| `layout` | `string` | `"row"` | `row`, `column`, `grid` | Компоновка кнопок |

**ButtonItem:**

| Поле | Тип | Обов'язково | Можливі значення | Опис |
|---|---|---|---|---|
| `text` | `string` | Так | — | Текст кнопки |
| `url` | `string` | Ні | — | Посилання (якщо є — рендериться як `<a>`) |
| `action` | `string` | Ні | — | Дія (напр. `open_twa`) — рендериться як `<button>` |
| `variant` | `string` | Ні | `primary`, `secondary`, `outline`, `ghost` | Стиль кнопки |
| `icon` | `string` | Ні | — | Назва SVG-іконки з реєстру |

---

### 1.4. `list` — Список

> Відображає впорядкований або невпорядкований список з описами.

```json
{
  "id": "c3d4e5f6-3333-4444-5555-666677778888",
  "type": "list",
  "order": 3,
  "props": {
    "items": [
      {
        "text": "Конструктор сторінок",
        "description": "створюй свій сайт блоками"
      },
      {
        "text": "Купи-Продай",
        "description": "вітрини товарів та послуг"
      }
    ],
    "ordered": false
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `items` | `ListItem[]` | `[]` | — | Масив елементів |
| `ordered` | `boolean` | `false` | — | Нумерований (`<ol>`) чи маркований (`<ul>`) |

**ListItem:**

| Поле | Тип | Обов'язково | Опис |
|---|---|---|---|
| `text` | `string` | Так | Текст елемента |
| `icon` | `string` | Ні | Назва SVG-іконки |
| `description` | `string` | Ні | Додатковий опис (показується після ` — `) |

---

### 1.5. `divider` — Розділювач

> Відображає горизонтальну лінію з налаштуванням стилю та відступу.

```json
{
  "id": "d4e5f6a7-4444-5555-6666-777788889999",
  "type": "divider",
  "order": 4,
  "props": {
    "style": "gradient",
    "spacing": "lg"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `style` | `string` | `"solid"` | `solid`, `dashed`, `dotted`, `gradient` | Стиль лінії |
| `spacing` | `string` | `"md"` | `none`, `sm`, `md`, `lg` | Відступ зверху/знизу |

---

## 2. Content блоки

### 2.1. `richtext` — Форматований текст

> Рендерить HTML-контент з підтримкою bold, italic, посилань, inline code та списків.

```json
{
  "id": "...",
  "type": "richtext",
  "order": 0,
  "props": {
    "html": "<p>Це <strong>жирний</strong> текст з <a href='#'>посиланням</a>.</p>"
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `html` | `string` | `""` | HTML-контент (dangerouslySetInnerHTML — тільки для admin!) |

---

### 2.2. `video` — Відео

> Вставляє відео з YouTube, Vimeo або прямого URL (.mp4/.webm).

```json
{
  "id": "...",
  "type": "video",
  "order": 0,
  "props": {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Відео-презентація",
    "caption": "Опис відео",
    "autoplay": false,
    "loop": false
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `url` | `string` | `""` | URL відео (YouTube, Vimeo, .mp4, .webm) |
| `title` | `string` | `""` | Заголовок (alt-текст) |
| `caption` | `string` | `""` | Підпис під відео |
| `autoplay` | `boolean` | `false` | Автозапуск |
| `loop` | `boolean` | `false` | Повторення |

---

### 2.3. `gallery` — Галерея зображень

> Сітка зображень з налаштуванням колонок та відступів.

```json
{
  "id": "...",
  "type": "gallery",
  "order": 0,
  "props": {
    "images": [
      { "src": "https://example.com/1.jpg", "alt": "Фото 1", "caption": "Підпис 1" },
      { "src": "https://example.com/2.jpg", "alt": "Фото 2" }
    ],
    "columns": "2",
    "rounded": true,
    "gap": "md"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `images` | `GalleryImage[]` | `[]` | — | Масив зображень |
| `columns` | `string` | `"2"` | `2`, `3`, `4` | Кількість колонок |
| `rounded` | `boolean` | `true` | — | Заокруглення |
| `gap` | `string` | `"md"` | `sm`, `md`, `lg` | Відступ між зображеннями |

**GalleryImage:** `src` (string, обов'язково), `alt` (string), `caption` (string)

---

### 2.4. `quote` — Цитата

> Блокова цитата з автором та стилями.

```json
{
  "id": "...",
  "type": "quote",
  "order": 0,
  "props": {
    "text": "Це чудова платформа!",
    "author": "Олексій",
    "role": "Користувач",
    "style": "border-left"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `text` | `string` | `""` | — | Текст цитати (обов'язковий для рендеру) |
| `author` | `string` | `""` | — | Автор |
| `role` | `string` | `""` | — | Посада/роль автора |
| `style` | `string` | `"border-left"` | `border-left`, `border-right`, `filled`, `outlined` | Стиль блоку |

---

### 2.5. `code` — Блок коду

> Сніпет коду з підтримкою мови, номерів рядків та кнопки копіювання.

```json
{
  "id": "...",
  "type": "code",
  "order": 0,
  "props": {
    "code": "console.log('Hello, world!');",
    "language": "javascript",
    "title": "Приклад",
    "showLineNumbers": true,
    "copyable": true
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `code` | `string` | `""` | Код (обов'язковий для рендеру) |
| `language` | `string` | `"plain"` | Мова програмування |
| `title` | `string` | `""` | Заголовок блоку |
| `showLineNumbers` | `boolean` | `false` | Показувати номери рядків |
| `copyable` | `boolean` | `true` | Кнопка копіювання |

---

### 2.6. `badge` — Бейджі

> Рядок кольорових бейджів/тегів.

```json
{
  "id": "...",
  "type": "badge",
  "order": 0,
  "props": {
    "items": [
      { "text": "Active", "variant": "green" },
      { "text": "VIP", "variant": "accent" },
      { "text": "Pending", "variant": "yellow" }
    ],
    "layout": "wrap"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `items` | `BadgeItem[]` | `[]` | — | Масив бейджів |
| `layout` | `string` | `"wrap"` | `wrap`, `nowrap` | Компоновка |

**BadgeItem:** `text` (string, обов'язково), `variant` (string: `accent`, `green`, `red`, `yellow`, `neutral`)

---

## 3. Layout блоки

### 3.1. `spacer` — Відступ

> Вертикальний відступ між блоками.

```json
{
  "id": "...",
  "type": "spacer",
  "order": 0,
  "props": {
    "height": "lg"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення |
|---|---|---|---|
| `height` | `string` | `"md"` | `xs`, `sm`, `md`, `lg`, `xl`, `2xl` |

---

### 3.2. `columns` — Колонки

> Контейнер з 2 або 3 колонками. Кожна колонка може містити вкладені блоки.

```json
{
  "id": "...",
  "type": "columns",
  "order": 0,
  "props": {
    "count": "2",
    "gap": "md",
    "columns": [
      { "width": "1/2" },
      { "width": "1/2" }
    ]
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `count` | `string` | `"2"` | `2`, `3` | Кількість колонок (якщо `columns` не вказано) |
| `gap` | `string` | `"md"` | `sm`, `md`, `lg` | Відступ між колонками |
| `columns` | `ColumnDef[]` | `[]` | — | Визначення колонок (перевищує `count`) |

**ColumnDef:** `width` (string: `auto`, `1/3`, `1/2`, `2/3`)

**children:** Масив вкладених блоків, які рендеряться в колонках.

---

### 3.3. `card` — Картка

> Стилізований контейнер з заголовком та дітьми.

```json
{
  "id": "...",
  "type": "card",
  "order": 0,
  "props": {
    "title": "Назва картки",
    "description": "Короткий опис",
    "padding": "md",
    "bordered": true,
    "elevated": false
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `title` | `string` | `""` | — | Заголовок картки |
| `description` | `string` | `""` | — | Опис під заголовком |
| `padding` | `string` | `"md"` | `sm`, `md`, `lg` | Внутрішній відступ |
| `bordered` | `boolean` | `true` | — | Рамка |
| `elevated` | `boolean` | `false` | — | Тінь (elevation) |

**children:** Масив вкладених блоків.

---

### 3.4. `hero` — Геройський блок

> Великий банер з заголовком, підзаголовком, фоновим зображенням та CTA.

```json
{
  "id": "...",
  "type": "hero",
  "order": 0,
  "props": {
    "title": "Ласкаво просимо",
    "subtitle": "Платформа для життя",
    "backgroundImage": "https://example.com/hero-bg.jpg",
    "buttons": [
      { "text": "Почати", "url": "https://t.me/bot", "variant": "primary" }
    ],
    "align": "center"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `title` | `string` | `""` | — | Головний заголовок |
| `subtitle` | `string` | `""` | — | Підзаголовок |
| `backgroundImage` | `string` | `""` | — | URL фонового зображення (з затемненням) |
| `buttons` | `HeroButton[]` | `[]` | — | CTA кнопки |
| `align` | `string` | `"center"` | `left`, `center`, `right` | Вирівнювання |

**HeroButton:** `text` (string), `url` (string), `variant` (string)

---

## 4. Navigation блоки

### 4.1. `nav` / `menu` — Навігація

> Меню з посиланнями, пілюлями, кнопками або підкресленням.

Реєстрації: `nav`, `menu`

```json
{
  "id": "...",
  "type": "nav",
  "order": 0,
  "props": {
    "items": [
      { "text": "Головна", "url": "/home", "icon": "home" },
      { "text": "Профіль", "url": "/profile", "icon": "user" },
      { "text": "Налаштування", "url": "/settings" }
    ],
    "direction": "vertical",
    "align": "left",
    "style": "links",
    "fontSize": "sm",
    "itemSpacing": "xs"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `items` | `NavItem[]` | `[]` | — | Пункти меню |
| `direction` | `string` | `"horizontal"` | `horizontal`, `vertical` | Напрямок |
| `align` | `string` | `"left"` | `left`, `center`, `right`, `space-between` | Вирівнювання |
| `style` | `string` | `"links"` | `links`, `pills`, `buttons`, `underline` | Стиль пунктів |
| `fontSize` | `string` | `"sm"` | `xs`, `sm`, `base`, `md`, `lg`, `xl` | Розмір шрифту |
| `itemSpacing` | `string` | `"xs"` | `none`, `xs`, `sm`, `md`, `lg`, `xl` | Відступ між пунктами |

**NavItem:** `text` (string, обов'язково), `url` (string), `icon` (string — назва SVG-іконки)

---

### 4.2. `tabs` — Вкладки

> Перемикач вкладок з різними стилями.

```json
{
  "id": "...",
  "type": "tabs",
  "order": 0,
  "props": {
    "tabs": [
      { "label": "Вкладка 1", "icon": "home", "content": "Контент першої вкладки" },
      { "label": "Вкладка 2", "content": "Контент другої вкладки" }
    ],
    "style": "underline"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `tabs` | `TabItem[]` | `[]` | — | Масив вкладок |
| `style` | `string` | `"underline"` | `underline`, `pills`, `enclosed` | Стиль вкладок |

**TabItem:** `label` (string, обов'язково), `icon` (string), `content` (string — HTML-контент вкладки)

---

### 4.3. `accordion` — Акордеон

> Розгорнуті/згорнуті секції.

```json
{
  "id": "...",
  "type": "accordion",
  "order": 0,
  "props": {
    "items": [
      { "title": "Питання 1", "content": "Відповідь 1", "open": false },
      { "title": "Питання 2", "content": "Відповідь 2" }
    ],
    "multiple": false
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `items` | `AccordionItem[]` | `[]` | Масив секцій |
| `multiple` | `boolean` | `false` | Дозволити одночасне відкриття кількох |

**AccordionItem:** `title` (string, обов'язково), `content` (string), `open` (boolean)

---

### 4.4. `link-button` / `button` / `link` — Одиночна кнопка

> Кнопка-посилання з налаштуванням стилю та розміру.

Реєстрації: `link-button`, `button`, `link`

```json
{
  "id": "...",
  "type": "link-button",
  "order": 0,
  "props": {
    "text": "Перейти на сайт",
    "url": "https://example.com",
    "target": "_blank",
    "variant": "primary",
    "size": "md",
    "align": "center",
    "icon": "external-link"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `text` | `string` | `"Перейти за посиланням"` | — | Текст кнопки |
| `url` | `string` | `"#"` | — | URL для переходу |
| `target` | `string` | `"_blank"` | `_blank`, `_self` | Ціль посилання |
| `variant` | `string` | `"primary"` | `primary`, `secondary`, `outline`, `ghost` | Стиль |
| `size` | `string` | `"md"` | `sm`, `md`, `lg` | Розмір |
| `align` | `string` | `"left"` | `left`, `center`, `right`, `full` | Вирівнювання |
| `icon` | `string` | — | — | Назва SVG-іконки |

---

### 4.5. `theme` / `theme-toggle` — Перемикач теми

> Перемикач світлої/темної теми та бренду (Apple/Material).

Реєстрації: `theme`, `theme-toggle`

```json
{
  "id": "...",
  "type": "theme",
  "order": 0,
  "props": {
    "variant": "modal",
    "label": "Тема",
    "showLabel": true,
    "align": "left"
  }
}
```

**ThemeBlock props:**

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `variant` | `string` | `"modal"` | `modal`, `toggle`, `compact` | Стиль перемикача |
| `label` | `string` | `"Тема"` | — | Текст мітки |
| `showLabel` | `boolean` | `true` | — | Показувати мітку |
| `align` | `string` | `"left"` | `left`, `center`, `right` | Вирівнювання |

**ThemeToggleBlock props:**

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `label` | `string` | `"Тема"` | — | Текст мітки |
| `showLabel` | `boolean` | `true` | — | Показувати мітку |
| `layout` | `string` | `"row"` | `row`, `column` | Компоновка |

---

## 5. Data блоки

### 5.1. `stat` — Метрика

> Картка з числовим значенням, позначкою та трендом.

```json
{
  "id": "...",
  "type": "stat",
  "order": 0,
  "props": {
    "value": "1 234",
    "label": "Користувачі",
    "description": "Активні за місяць",
    "icon": "users",
    "trend": "up",
    "trendValue": "+12%"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `value` | `string` | `"0"` | — | Головне значення |
| `label` | `string` | `""` | — | Позначка (згори) |
| `description` | `string` | `""` | — | Опис (знизу) |
| `icon` | `string` | `""` | — | SVG-іконка |
| `trend` | `string` | `"neutral"` | `up`, `down`, `neutral` | Напрямок тренду |
| `trendValue` | `string` | `""` | — | Текст тренду (напр. `+12%`) |

---

### 5.2. `progress` — Прогрес-бар

> Прогрес-бар з міткою та відсотком.

```json
{
  "id": "...",
  "type": "progress",
  "order": 0,
  "props": {
    "value": 72,
    "max": 100,
    "label": "Завершення профілю",
    "showPercent": true,
    "color": "accent"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `value` | `number` | `0` | — | Поточне значення |
| `max` | `number` | `100` | — | Максимальне значення |
| `label` | `string` | `""` | — | Мітка |
| `showPercent` | `boolean` | `true` | — | Показувати відсоток |
| `color` | `string` | `"accent"` | `accent`, `green`, `yellow`, `red` | Колір бару |

---

### 5.3. `table` — Таблиця

> Таблиця даних з заголовками та рядками.

```json
{
  "id": "...",
  "type": "table",
  "order": 0,
  "props": {
    "headers": ["Назва", "Ціна", "Статус"],
    "rows": [
      ["Товар 1", "100 грн", "В наявності"],
      ["Товар 2", "250 грн", "Замовлення"]
    ],
    "striped": true,
    "bordered": true
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `headers` | `string[]` | `[]` | Заголовки колонок (обов'язкові для рендеру) |
| `rows` | `string[][]` | `[]` | Рядки даних |
| `striped` | `boolean` | `true` | Чергування кольору рядків |
| `bordered` | `boolean` | `true` | Рамка |

---

### 5.4. `rating` — Рейтинг

> Зірковий рейтинг з налаштуванням розміру.

```json
{
  "id": "...",
  "type": "rating",
  "order": 0,
  "props": {
    "value": 4.5,
    "max": 5,
    "label": "Оцінка",
    "size": "md"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `value` | `number` | `0` | — | Значення рейтингу |
| `max` | `number` | `5` | — | Максимум зірок |
| `label` | `string` | `""` | — | Мітка |
| `size` | `string` | `"md"` | `sm`, `md`, `lg` | Розмір зірок |

---

## 6. Commerce блоки

### 6.1. `pricing` — Тарифні плани

> Картки тарифних планів з функціями та CTA.

```json
{
  "id": "...",
  "type": "pricing",
  "order": 0,
  "props": {
    "plans": [
      {
        "name": "Безкоштовний",
        "price": "0",
        "period": "/міс",
        "features": ["5 сторінок", "Базові блоки", "Email підтримка"],
        "highlighted": false,
        "ctaText": "Почати",
        "ctaUrl": "https://t.me/bot?start=free"
      },
      {
        "name": "Pro",
        "price": "99",
        "period": "/міс",
        "features": ["Необмежені сторінки", "Всі блоки", "Пріоритетна підтримка"],
        "highlighted": true,
        "ctaText": "Обрати Pro",
        "ctaUrl": "https://t.me/bot?start=pro"
      }
    ],
    "columns": "auto"
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `plans` | `PricingPlan[]` | `[]` | Масив планів |
| `columns` | `string` | `"auto"` | Кількість колонок (`auto` = за кількістю планів, макс. 3) |

**PricingPlan:**

| Поле | Тип | Обов'язково | Опис |
|---|---|---|---|
| `name` | `string` | Так | Назва плану |
| `price` | `string` | Так | Ціна |
| `period` | `string` | Ні | Період (напр. `/міс`) |
| `features` | `string[]` | Ні | Список функцій |
| `highlighted` | `boolean` | Ні | Виділений план (accent border + badge) |
| `ctaText` | `string` | Ні | Текст кнопки |
| `ctaUrl` | `string` | Ні | URL кнопки |

---

### 6.2. `testimonial` — Відгук

> Відгук клієнта з оцінкою зірками та аватаром.

```json
{
  "id": "...",
  "type": "testimonial",
  "order": 0,
  "props": {
    "text": "Чудова платформа, рекомендую!",
    "author": "Марія",
    "role": "Підприємець",
    "avatar": "https://example.com/avatar.jpg",
    "rating": 5
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `text` | `string` | `""` | Текст відгуку |
| `author` | `string` | `""` | Ім'я автора |
| `role` | `string` | `""` | Посада/роль |
| `avatar` | `string` | `""` | URL аватара |
| `rating` | `number` | `0` | Оцінка (0-5 зірок) |

---

### 6.3. `feature-card` — Картки функцій

> Сітка карток з іконкою, заголовком та описом.

```json
{
  "id": "...",
  "type": "feature-card",
  "order": 0,
  "props": {
    "items": [
      { "icon": "home", "title": "Конструктор", "description": "Створюйте сторінки блоками" },
      { "icon": "shopping-cart", "title": "Маркетплейс", "description": "Купуйте та продавайте" },
      { "icon": "gift", "title": "Дарую", "description": "Обмін та благодійність" }
    ],
    "columns": "2"
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `items` | `FeatureItem[]` | `[]` | Масив карток |
| `columns` | `string` | `"2"` | Кількість колонок |

**FeatureItem:** `icon` (string — SVG-іконка), `title` (string, обов'язково), `description` (string)

---

### 6.4. `faq` — Часті питання

> Спеціалізований акордеон для FAQ з заголовком секції.

```json
{
  "id": "...",
  "type": "faq",
  "order": 0,
  "props": {
    "title": "Часті питання",
    "items": [
      { "question": "Чи це безкоштовно?", "answer": "Так, базові можливості безкоштовні." },
      { "question": "Потрібен додаток?", "answer": "Ні, все в Telegram." }
    ]
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `title` | `string` | `"Часті питання"` | Заголовок секції |
| `items` | `FaqItem[]` | `[]` | Масив питань-відповідей |

**FaqItem:** `question` (string, обов'язково), `answer` (string, обов'язково)

---

## 7. Forms блоки

### 7.1. `input` — Поле введення

```json
{
  "id": "...",
  "type": "input",
  "order": 0,
  "props": {
    "label": "Ваше ім'я",
    "placeholder": "Введіть ім'я",
    "type": "text",
    "required": true,
    "name": "user_name"
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `label` | `string` | `""` | — | Мітка поля |
| `placeholder` | `string` | `""` | — | Підказка |
| `type` | `string` | `"text"` | `text`, `email`, `phone`, `number`, `password` | Тип поля |
| `required` | `boolean` | `false` | — | Обов'язкове |
| `name` | `string` | `""` | — | Ім'я поля (для форми) |

---

### 7.2. `textarea` — Багаторядкове поле

```json
{
  "id": "...",
  "type": "textarea",
  "order": 0,
  "props": {
    "label": "Ваш коментар",
    "placeholder": "Напишіть щось...",
    "rows": 4,
    "required": false,
    "name": "comment"
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `label` | `string` | `""` | Мітка |
| `placeholder` | `string` | `""` | Підказка |
| `rows` | `number` | `4` | Кількість рядків |
| `required` | `boolean` | `false` | Обов'язкове |
| `name` | `string` | `""` | Ім'я поля |

---

### 7.3. `select` — Випадаючий список

```json
{
  "id": "...",
  "type": "select",
  "order": 0,
  "props": {
    "label": "Ваше місто",
    "options": [
      { "value": "kyiv", "label": "Київ" },
      { "value": "lviv", "label": "Львів" },
      { "value": "odesa", "label": "Одеса" }
    ],
    "placeholder": "Оберіть місто",
    "required": true,
    "name": "city"
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `label` | `string` | `""` | Мітка |
| `options` | `SelectOption[]` | `[]` | Варіанти |
| `placeholder` | `string` | `"Оберіть..."` | Текст за замовчуванням |
| `required` | `boolean` | `false` | Обов'язкове |
| `name` | `string` | `""` | Ім'я поля |

**SelectOption:** `value` (string, обов'язково), `label` (string, обов'язково)

---

## 8. Bot-domain блоки

> Спеціалізовані блоки для Telegram-бота. Автоматично завантажують дані з API.

### 8.1. `user-profile` — Профіль користувача
### 8.2. `date-card` — Картка дати
### 8.3. `my-dates-table` — Таблиця моїх дат
### 8.4. `compare-setup` — Налаштування порівняння
### 8.5. `compare-systems` — Системи порівняння
### 8.6. `compare-table` — Таблиця порівняння
### 8.7. `date-analysis` — Аналіз дати

Ці блоки мають мінімальні props, оскільки дані завантажуються з API автоматично. Деталі — в коді відповідних компонентів.

---

## 9. Analytics + Raw + Platform блоки

### 9.1. `chart` — Діаграма

> Стовпчикова або кругова діаграма.

```json
{
  "id": "...",
  "type": "chart",
  "order": 0,
  "props": {
    "title": "Статистика",
    "data": [
      { "label": "Січень", "value": 120, "color": "#4f46e5" },
      { "label": "Лютий", "value": 200, "color": "#22c55e" }
    ],
    "type": "bar",
    "showLabels": true
  }
}
```

| Пrop | Тип | Дефолт | Можливі значення | Опис |
|---|---|---|---|---|
| `title` | `string` | — | — | Заголовок діаграми |
| `data` | `ChartData[]` | `[]` | — | дані |
| `type` | `string` | `"bar"` | `bar`, `pie` | Тип діаграми |
| `showLabels` | `boolean` | `true` | — | Показувати значення |

**ChartData:** `label` (string, обов'язково), `value` (number, обов'язково), `color` (string — CSS-колір)

---

### 9.2. `html` — Сирий HTML

> Рендерить HTML-код. Тільки для admin!

```json
{
  "id": "...",
  "type": "html",
  "order": 0,
  "props": {
    "code": "<div style='color:red'>Привіт!</div>",
    "sandbox": true
  }
}
```

| Пrop | Тип | Дефолт | Опис |
|---|---|---|---|
| `code` | `string` | `""` | HTML-код |
| `sandbox` | `boolean` | `true` | Пісочниця (обмежені стилі) |

---

### 9.3. `theme-toggle` — Перемикач теми (platform)

Див. розділ 4.5.

---

## Альяс-назви (aliases)

Деякі типи мають кілька назв для зручності:

| Основна назва | Альяси |
|---|---|
| `nav` | `menu` |
| `link-button` | `button`, `link` |
| `theme-toggle` | `theme` |

---

## Conditions — Умови показу

Будь-який блок може мати поле `conditions` для conditional rendering:

```json
{
  "id": "...",
  "type": "buttons",
  "order": 0,
  "props": { ... },
  "conditions": {
    "role": ["admin", "vip"],
    "tariff": ["pro", "enterprise"],
    "minDiscount": 10,
    "permissions": ["settings"]
  }
}
```

| Поле | Тип | Опис |
|---|---|---|
| `role` | `string[]` | Показати якщо роль користувача в масиві (OR) |
| `tariff` | `string[]` | Показати якщо тариф в масиві (OR) |
| `status` | `string[]` | Показати якщо статус в масиві (OR) |
| `minDiscount` | `number` | Показати якщо знижка >= значення |
| `permissions` | `string[]` | Показати якщо є хоча б один дозвіл (OR) |
| `fieldMatch` | `Record<string, string\|number\|boolean>` | Довільне поле користувача |
| `fallback` | `PageBlock` | Альтернативний блок, якщо умови НЕ виконуються |

Всі умови поєднуються через **AND** (всі мають виконатися). Масиви значень працюють як **OR**.

---

*Документ оновлюється при додаванні нових блоків. Джерело істини — код в `packages/ui/src/blocks/`.*
