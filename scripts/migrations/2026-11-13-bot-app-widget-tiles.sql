-- 13.11.2026 — головний віджет: кольорові плитки розділів і профіль-безпечний HTML.
--
-- Попередня версія ламалась у справжньому клієнті, бо віджет малює нативний
-- рендерер, а не WebView: він вирізає clipPath (лого вилазило за коло),
-- шрифти з назвою (серифи зникали) і не має vh. Тут лише те, що профіль лишає:
-- system-ui, px, flex/grid, градієнти, тіні без blur, @keyframes.
--
-- Що в документі:
--   * шапка темно-зелена, бренд-рядок великим кеглем (13/10 px замість 7.5);
--   * чотири кольорові плитки (трекери, сервіси, розвиток, обране) — звичайні
--     <a href="__PLATFORM__/...">: такий тап Telegram відкриває сам, без JS;
--   * «Про платформу» і «Контакти» — кнопки в ряд, «Назад до старту» — 46 px;
--   * «Контакти» на темно-зеленому тлі, щоб види не повторювались.
--
-- Розмір: 8512 байт сирого, 2950 байт після zlib-9 (межа 4096).

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
.v{flex:1;display:flex;flex-direction:column;padding:16px 18px 0;min-height:0;background:#fff7e9;animation:up .24s ease both}
.v[hidden]{display:none}
[hidden]{display:none!important}
.v.dk{background:linear-gradient(150deg,#0e3b2c,#1c5c46 70%,#0e3b2c)}
@keyframes up{from{opacity:.02;transform:translateY(6px)}to{opacity:1;transform:none}}
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
.t s{display:block;font-size:9px;font-weight:700;letter-spacing:1.1px;line-height:1.1;text-decoration:none;color:rgba(255,255,255,.88);margin-top:2px}
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
.r u{font-size:15px;color:#c8552c;text-decoration:none;line-height:1}
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
<a class="t c1" href="__PLATFORM__/trackers"><i><span class="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff8ec" stroke-width="2.2" stroke-linecap="round"><path d="M4 19V11M10 19V5M16 19v-6M22 19H2"/></svg></span><span style="font-size:13px;color:rgba(255,255,255,.85)">↗</span></i><span><b>Трекери</b><s>ПОКАЗНИКИ</s></span></a>
<a class="t c2" href="__PLATFORM__/services"><i><span class="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fffbe8" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg></span><span style="font-size:13px;color:rgba(255,255,255,.85)">↗</span></i><span><b>Сервіси</b><s>ДЛЯ РОБОТИ</s></span></a>
<a class="t c3" href="__PLATFORM__/assessments"><i><span class="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff8ec" stroke-width="2.2" stroke-linecap="round"><path d="M3 18 9 11l4 3 7-9"/></svg></span><span style="font-size:13px;color:rgba(255,255,255,.85)">↗</span></i><span><b>Розвиток</b><s>ОЦІНКИ</s></span></a>
<a class="t c4" href="__PLATFORM__/favorites"><i><span class="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff8ec" stroke-width="2.2" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z"/></svg></span><span style="font-size:13px;color:rgba(255,255,255,.85)">↗</span></i><span><b>Обране</b><s>ЗБЕРЕЖЕНЕ</s></span></a>
</div>
<div class="rs"><button class="r" data-k="about"><b>Про платформу</b><u>›</u></button><button class="r" data-k="contacts"><b>Контакти</b><u>›</u></button></div>
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
