<!-- §3: схема D1 -->
> **Частина специфікації `SITES_SPEC`.** Покажчик розділів — [`docs/SITES_SPEC.md`](../SITES_SPEC.md).

## 3. Схема D1

### 3.1. Таблиця `sites`

```sql
CREATE TABLE IF NOT EXISTS sites (
  id            TEXT PRIMARY KEY,           -- UUID v4
  slug          TEXT UNIQUE NOT NULL,       -- codeword = домен сайту
  title         TEXT NOT NULL,
  description   TEXT,                       -- короткий опис для каталогу
  owner_id      INTEGER NOT NULL,           -- user_id з Telegram
  status        TEXT DEFAULT 'draft',       -- draft | pending | published | rejected
  template_id   TEXT,                       -- з якого шаблону створено (null = з нуля)
  settings      TEXT DEFAULT '{}',          -- JSON: навігація, тема, logo...
  is_public     INTEGER DEFAULT 0,          -- 1 = додано в публічний каталог
  thumbnail     TEXT,                       -- URL превʼю для каталогу
  reject_reason TEXT,                       -- причина відхилення
  created_at    TEXT,
  updated_at    TEXT,
  published_at  TEXT
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_sites_owner ON sites(owner_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_public ON sites(is_public, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);
```

### 3.2. Таблиця `site_pages`

```sql
CREATE TABLE IF NOT EXISTS site_pages (
  id            TEXT PRIMARY KEY,           -- UUID v4
  site_id       TEXT NOT NULL,              -- FK → sites.id
  slug          TEXT NOT NULL,              -- slug сторінки ('home' = head)
  title         TEXT NOT NULL,
  page_data     TEXT DEFAULT '{}',          -- JSON PageConfig
  order_index   INTEGER DEFAULT 0,          -- порядок в навігації
  status        TEXT DEFAULT 'draft',       -- draft | published
  meta          TEXT DEFAULT '{}',          -- JSON: SEO, og:image...
  created_at    TEXT,
  updated_at    TEXT,
  published_at  TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Унікальний slug в межах сайту
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON site_pages(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_pages_site ON site_pages(site_id);
```

### 3.3. Таблиця `templates`

```sql
CREATE TABLE IF NOT EXISTS templates (
  id            TEXT PRIMARY KEY,           -- UUID v4
  name          TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL,              -- 'site' | 'page'
  thumbnail     TEXT,                       -- URL превʼю
  config        TEXT NOT NULL,              -- JSON: структура шаблону
  is_system     INTEGER DEFAULT 0,          -- 1 = вбудований (не видалити)
  owner_id      INTEGER,                   -- null = system, user_id = user-created
  tags          TEXT DEFAULT '[]',          -- JSON array тегів для фільтрації
  created_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type, is_system);
CREATE INDEX IF NOT EXISTS idx_templates_owner ON templates(owner_id);
```

---

