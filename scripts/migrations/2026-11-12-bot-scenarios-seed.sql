-- 12.11.2026 — перші сценарії бота на віджетах.
--
-- `/start` — віджет (приватний чат). `about` — rich зі кнопкою назад: кнопки
-- живуть у тілі повідомлення (`<tg-button-row>`), а не під ним.

INSERT INTO "bot_scenarios" (lookup, kind, caption, widget_html, widget_data, rich_html)
VALUES (
  '/start',
  'widget',
  'ПАЛЯНИЦЯ — ділова платформа для Своїх',
  '<style>body{margin:0;padding:20px 18px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;color:var(--tg-theme-text-color,#1a1a1a)}h1{margin:10px 0 2px;font-size:26px;letter-spacing:1px}p{margin:0 0 18px;color:var(--tg-theme-hint-color,#707579);font-size:14px}button{display:block;width:100%;margin:8px 0;padding:12px 14px;border:0;border-radius:12px;font-size:15px;background:var(--tg-theme-button-color,#2a7fff);color:var(--tg-theme-button-text-color,#fff)}</style><div><div>🥖</div><h1>ПАЛЯНИЦЯ</h1><p>ділова платформа для Своїх</p><button data-k="about">Про платформу</button><button data-k="contacts">Зв''язок</button></div><script>document.querySelectorAll("button").forEach(function(b){b.onclick=function(){TelegramWidget.request(b.dataset.k)}})</script>',
  '{}',
  NULL
)
ON CONFLICT(lookup) DO UPDATE SET
  kind = excluded.kind,
  caption = excluded.caption,
  widget_html = excluded.widget_html,
  widget_data = excluded.widget_data,
  updated_at = datetime('now');

INSERT INTO "bot_scenarios" (lookup, kind, caption, widget_html, widget_data, rich_html)
VALUES (
  'about',
  'rich',
  NULL,
  NULL,
  NULL,
  '<h1>ПАЛЯНИЦЯ</h1><p>Ділова платформа для Своїх: знайомства, сервіси й інструменти в одному місці.</p><tg-button-row><tg-button type="callback_data" data="/start">Назад</tg-button></tg-button-row>'
)
ON CONFLICT(lookup) DO UPDATE SET
  kind = excluded.kind,
  rich_html = excluded.rich_html,
  updated_at = datetime('now');
