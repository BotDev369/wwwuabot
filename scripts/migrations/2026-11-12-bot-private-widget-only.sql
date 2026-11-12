-- 12.11.2026 — у приватному чаті лише віджети: rich тут не показується.
--
-- `about` і `contacts` були rich, тобто в приваті вони вже не рендерились би.
-- Переводимо обидва у віджети в тій самій системі, що й старт: та смуга,
-- той самий navy і золото, та сама картка-кнопка «назад».

UPDATE "bot_scenarios"
SET
  kind = 'widget',
  rich_html = NULL,
  widget_data = '{}',
  widget_html = '<style>*{box-sizing:border-box}body{margin:0;background:#fdf7ea;color:#16233a;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.b{height:18px;background:url("data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''36'' height=''18''%3E%3Cpath d=''M0 9 9 1 18 9 9 17Z'' fill=''none'' stroke=''%23f2b73c'' stroke-width=''1.6''/%3E%3Cpath d=''M18 9 27 1 36 9 27 17Z'' fill=''none'' stroke=''%23d94f3d'' stroke-width=''1.6''/%3E%3C/svg%3E") repeat-x 0 0/36px 18px,#1b3a6b}.h{background:linear-gradient(165deg,#24528f,#1b3a6b 58%,#152745);padding:16px 18px 18px}h1{margin:0;font-size:20px;letter-spacing:1px;font-weight:700;color:#fff}.h p{margin:4px 0 0;font-size:12px;color:#eddfbd;letter-spacing:.3px}.c{padding:14px}p{margin:0 0 10px;color:#3b465e}.k{display:flex;align-items:center;gap:9px;width:100%;margin:2px 0 0;padding:11px 13px;border:1px solid #eee0c3;border-radius:14px;background:#fff;color:#16233a;font:inherit;font-size:15px;font-weight:600;text-align:left;box-shadow:0 1px 2px #16233a0d}.k:active{background:#fffdf6}.k i{font-style:normal;color:#bd9a33;font-size:19px;line-height:1}</style><div><div class="b"></div><div class="h"><h1>Про платформу</h1><p>ПАЛЯНИЦЯ · ділова платформа для Своїх</p></div><div class="b"></div><div class="c"><p>ПАЛЯНИЦЯ — це місце Своїх: знайомства й контакти, сервіси, інструменти для щоденних справ і власні сторінки.</p><p>Тут не треба пояснювати, хто ти: тебе вже запросили.</p><button class="k" data-k="/start"><i>‹</i>Назад</button></div></div><script>document.querySelectorAll("[data-k]").forEach(function(b){b.onclick=function(){TelegramWidget.request(b.getAttribute("data-k"))}})</script>',
  updated_at = datetime('now')
WHERE lookup = 'about';

UPDATE "bot_scenarios"
SET
  kind = 'widget',
  rich_html = NULL,
  widget_data = '{}',
  widget_html = '<style>*{box-sizing:border-box}body{margin:0;background:#fdf7ea;color:#16233a;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.b{height:18px;background:url("data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''36'' height=''18''%3E%3Cpath d=''M0 9 9 1 18 9 9 17Z'' fill=''none'' stroke=''%23f2b73c'' stroke-width=''1.6''/%3E%3Cpath d=''M18 9 27 1 36 9 27 17Z'' fill=''none'' stroke=''%23d94f3d'' stroke-width=''1.6''/%3E%3C/svg%3E") repeat-x 0 0/36px 18px,#1b3a6b}.h{background:linear-gradient(165deg,#24528f,#1b3a6b 58%,#152745);padding:16px 18px 18px}h1{margin:0;font-size:20px;letter-spacing:1px;font-weight:700;color:#fff}.h p{margin:4px 0 0;font-size:12px;color:#eddfbd;letter-spacing:.3px}.c{padding:14px}p{margin:0 0 10px;color:#3b465e}.k{display:flex;align-items:center;gap:9px;width:100%;margin:2px 0 0;padding:11px 13px;border:1px solid #eee0c3;border-radius:14px;background:#fff;color:#16233a;font:inherit;font-size:15px;font-weight:600;text-align:left;box-shadow:0 1px 2px #16233a0d}.k:active{background:#fffdf6}.k i{font-style:normal;color:#bd9a33;font-size:19px;line-height:1}</style><div><div class="b"></div><div class="h"><h1>Зв’язок</h1><p>ПАЛЯНИЦЯ · ділова платформа для Своїх</p></div><div class="b"></div><div class="c"><p>Пиши адміну платформи — відповімо й допоможемо з доступом, сервісами та ідеями.</p><p>Свої завжди на зв’язку.</p><button class="k" data-k="/start"><i>‹</i>Назад</button></div></div><script>document.querySelectorAll("[data-k]").forEach(function(b){b.onclick=function(){TelegramWidget.request(b.getAttribute("data-k"))}})</script>',
  updated_at = datetime('now')
WHERE lookup = 'contacts';
