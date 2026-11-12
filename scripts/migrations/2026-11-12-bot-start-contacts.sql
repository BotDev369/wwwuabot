-- 12.11.2026 — сценарій «Зв’язок» для другої картки стартового віджета.
--
-- Без нього кнопка `contacts` шукала неіснуючий ключ і тапів просто не було
-- видно: людина тисне — і нічого.

INSERT INTO "bot_scenarios" (lookup, kind, caption, widget_html, widget_data, rich_html)
VALUES (
  'contacts',
  'rich',
  NULL,
  NULL,
  NULL,
  '<h1>Зв’язок</h1><p>Пиши адміну платформи — відповімо й допоможемо з доступом, сервісами та ідеями.</p><p>Свої завжди на зв’язку.</p><tg-button-row><tg-button type="callback_data" data="/start">Назад</tg-button></tg-button-row>'
)
ON CONFLICT(lookup) DO UPDATE SET
  kind = excluded.kind,
  rich_html = excluded.rich_html,
  updated_at = datetime('now');
