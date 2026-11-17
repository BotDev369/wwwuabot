-- 17.11.2026 — головний віджет бота веде в те саме меню, що й платформа.
--
-- Плитки вели в трекери, сервіси, розвиток і обране — екрани, які після
-- «Світанку» живуть під «Ще». Людина ж починає день із «Мого дня», а крамниця,
-- гурт і профіль — це три інші головні входи. Тому плитки тепер повторюють
-- меню платформи: «Мій день» (корінь), «Базар», «Гурт», «Я».
--
-- Решта документа не змінюється: профіль рендерера, плитки на `<a href>` (такий
-- тап Telegram відкриває сам, без JS), «Про платформу» й «Контакти» під ними.
-- Адреса платформи лишається маркером `__PLATFORM__` — домен ставить бот.
--
-- Розмір: 8575 байт сирого, 2931 байт після zlib-9 (межа 4096).

UPDATE "bot_scenarios"
SET
  widget_html = '<style>
*{box-sizing:border-box}
body{margin:0;font:15px/1.45 system-ui,sans-serif;color:#12302a;background:#fff7e9}
.s{height:430px;display:flex;flex-direction:column;overflow:hidden;background:#fff7e9}
.hd{display:flex;align-items:center;gap:10px;padding:13px 18px;background:#0e3b2c;color:#fff3dc}
.lg{width:34px;height:34px;flex:0 0 34px;border-radius:50%;overflow:hidden;background:#2a1206;box-shadow:0 0 0 1px rgba(255,255,255,.25)}
.lg svg{display:block;width:34px;height:34px}
.bn b{display:block;font-size:13px;font-weight:800;letter-spacing:2.6px;line-height:1.15;color:#fff3dc}
.bn i{display:block;font-style:normal;font-size:10px;font-weight:700;letter-spacing:1.5px;margin-top:3px;color:#e9b44c}
.v{flex:1;display:flex;flex-direction:column;padding:16px 18px 0;min-height:0;background:#fff7e9}
.v[hidden]{display:none}
.v.dk{background:linear-gradient(150deg,#0e3b2c,#1c5c46 70%,#0e3b2c)}
h1,h2{margin:0;font-weight:800;letter-spacing:-.7px;line-height:1.05;color:#0e3b2c}
h1{font-size:27px}
h2{font-size:26px}
h1 em{display:block;font-style:italic;font-weight:700;font-size:19px;letter-spacing:-.2px;color:#c8552c;margin-top:5px}
.dk h2{color:#fff6e2}
.sb{font-size:11px;font-weight:800;letter-spacing:1.9px;color:#b0812c;margin:14px 0 8px}
.gr{display:grid;grid-template-columns:1fr 1fr;gap:9px}
a.t{display:flex;flex-direction:column;justify-content:space-between;gap:5px;min-height:0;padding:8px 10px;border-radius:14px;text-decoration:none;color:#fffaf0;box-shadow:0 2px 0 rgba(0,0,0,.07)}
a.t:active{transform:scale(.97)}
.t i{display:flex;align-items:center;justify-content:space-between;font-style:normal;line-height:1}
.t .sub{display:block;font-size:9px;font-weight:700;letter-spacing:1.1px;line-height:1.1;text-decoration:none;color:rgba(255,255,255,.88);margin-top:2px}
.t b{font-size:15px;font-weight:800;letter-spacing:-.2px;line-height:1.15}
.ic{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.2)}
.c1{background:linear-gradient(135deg,#177050,#0c4031)}
.c2{background:linear-gradient(135deg,#eda93c,#c9761a)}
.c3{background:linear-gradient(135deg,#d45f33,#a63c1c)}
.c4{background:linear-gradient(135deg,#2f8090,#1b5768)}
.rs{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0 10px}
.r{display:flex;align-items:center;justify-content:center;gap:5px;height:42px;padding:0 10px;border:1px solid #dcc9a6;border-radius:12px;background:#fffdf7;font:700 14px system-ui,sans-serif;color:#0e3b2c}
.r:active{background:#f6e8cf;transform:scale(.98)}
.r b{font-weight:700}
.r .ch{font-size:15px;color:#c8552c;text-decoration:none;line-height:1}
.ft{display:flex;align-items:center;justify-content:space-between;padding:9px 18px;background:#0e3b2c;color:#cbe0d3;font-size:9px;font-weight:800;letter-spacing:1.6px}
.ft b{color:#e9b44c;font-variant-numeric:tabular-nums}
.bk{display:block;width:100%;height:46px;margin:14px 0 12px;border:0;border-radius:13px;background:#0e3b2c;color:#fff3dc;font:800 15px system-ui,sans-serif;box-shadow:0 2px 0 #0a2a20;transition:transform .12s ease}
.bk:active{transform:scale(.98)}
.dk .bk{background:#e9b44c;color:#22331a;box-shadow:0 2px 0 #b98a2e}
.tx{font-size:17px;line-height:1.5;color:#2c4740;margin:12px 0 0;max-width:23ch;font-weight:600}
.dk .tx{color:#e6f5ea}
.sp{flex:1}
.mid{text-align:center;align-items:center}
.mid .tx{margin-left:auto;margin-right:auto;color:#3d6b5c;max-width:20ch}
.dot{width:34px;height:3px;border-radius:2px;background:#e9b44c;margin:12px 0 0}
.mid .dot{margin:12px auto 0}
[hidden]{display:none}
</style>
<div class="s">
<div class="hd"><span class="lg"><svg viewBox="0 0 64 64" aria-hidden="true">
<defs><radialGradient id="g" cx="34%" cy="24%" r="82%"><stop offset="0" stop-color="#d7a267"/><stop offset=".35" stop-color="#a8692c"/><stop offset=".72" stop-color="#6d3a10"/><stop offset="1" stop-color="#3a1b04"/></radialGradient><linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdf0d2"/><stop offset="1" stop-color="#e0bc85"/></linearGradient></defs>
<circle cx="32" cy="32" r="32" fill="url(#g)"/>
<circle cx="32" cy="32" r="30.5" fill="none" stroke="#ffe9c0" stroke-opacity=".28" stroke-width="1.6"/>
<g stroke="url(#c)" stroke-width="3.4" stroke-linecap="round" fill="none"><path d="M17 21 45 41"/><path d="M19 43 45 20"/><path d="M15 31 29 49"/><path d="M35 15 48 27"/></g>
<g fill="#fff5e2" fill-opacity=".8"><ellipse cx="24" cy="24" rx="1.5" ry="1"/><ellipse cx="36" cy="19" rx="1.4" ry="1"/><ellipse cx="44" cy="30" rx="1.5" ry="1"/><ellipse cx="27" cy="34" rx="1.4" ry="1"/><ellipse cx="38" cy="39" rx="1.5" ry="1"/><ellipse cx="21" cy="43" rx="1.4" ry="1"/><ellipse cx="33" cy="48" rx="1.4" ry="1"/></g>
</svg></span><span class="bn"><b>ПАЛЯНИЦЯ</b><i>ДІЛОВА ПЛАТФОРМА</i></span></div>

<div class="v" id="v-start"><h1>Ділова платформа<em>для Своїх</em></h1>
<p class="sb">РОЗДІЛИ ПЛАТФОРМИ</p>
<div class="gr">
<a class="t c1" href="__PLATFORM__/"><i><span class="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff8ec" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z"/></svg></span><span style="font-size:13px;color:rgba(255,255,255,.85)">↗</span></i><span><b>Мій день</b><span class="sub">СЬОГОДНІ</span></span></a>
<a class="t c2" href="__PLATFORM__/pages"><i><span class="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fffbe8" stroke-width="2.2" stroke-linejoin="round"><path d="M4 8h16l-1 12H5Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg></span><span style="font-size:13px;color:rgba(255,255,255,.85)">↗</span></i><span><b>Базар</b><span class="sub">КРАМНИЦЯ</span></span></a>
<a class="t c3" href="__PLATFORM__/users"><i><span class="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff8ec" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M16.5 5.3a3 3 0 0 1 0 5.4"/><path d="M18 14.2a4 4 0 0 1 3 3.8v2"/></svg></span><span style="font-size:13px;color:rgba(255,255,255,.85)">↗</span></i><span><b>Гурт</b><span class="sub">СВОЇ</span></span></a>
<a class="t c4" href="__PLATFORM__/account"><i><span class="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff8ec" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20v-1a6 6 0 0 1 6-6h3a6 6 0 0 1 6 6v1"/></svg></span><span style="font-size:13px;color:rgba(255,255,255,.85)">↗</span></i><span><b>Я</b><span class="sub">ПРОФІЛЬ</span></span></a>
</div>
<div class="rs"><button class="r" data-k="about"><b>Про платформу</b><span class="ch">›</span></button><button class="r" data-k="contacts"><b>Контакти</b><span class="ch">›</span></button></div>
</div><div class="ft" id="f-start"><span>СТАРТ</span><b>01 / 03</b></div>

<div class="v" id="v-about" hidden><h2>Про платформу</h2><div class="dot"></div>
<p class="tx">ПАЛЯНИЦЯ — ділова платформа для Своїх.</p><div class="sp"></div>
<button class="bk" data-k="start">← Назад до старту</button></div><div class="ft" id="f-about" hidden><span>ПРО ПЛАТФОРМУ</span><b>02 / 03</b></div>

<div class="v dk" id="v-contacts" hidden><h2>Контакти</h2><div class="dot"></div>
<p class="tx">Зв’язок з адміністратором.</p><div class="sp"></div>
<button class="bk" data-k="start">← Назад до старту</button></div><div class="ft" id="f-contacts" hidden><span>КОНТАКТИ</span><b>03 / 03</b></div>
</div>
<script>
var W=window.TelegramWidget,P=["start","about","contacts"],F={"start":"f-start","about":"f-about","contacts":"f-contacts"};
function view(n){
  if(P.indexOf(n)<0)n="start";
  for(var i=0;i<P.length;i++){
    var k=P[i],on=k===n;
    document.getElementById("v-"+k).hidden=!on;
    document.getElementById(F[k]).hidden=!on;
  }
}
document.addEventListener("click",function(e){
  var el=e.target.closest?e.target.closest("[data-k]"):null;
  if(!el)return;
  e.preventDefault();
  var k=el.getAttribute("data-k");
  view(k);
  if(W&&W.request){try{W.request(k)}catch(x){}}
});
function draw(){var s={};try{s=JSON.parse((W&&W.chatData)||"{}")}catch(e){}view(s.v||"start")}
if(W){W.onEvent("chatDataChanged",draw);draw()}
</script>',
  widget_data = '{"v":"start"}',
  updated_at = datetime('now')
WHERE lookup = '/start';
