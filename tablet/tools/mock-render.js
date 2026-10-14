// Rende index.html (1024x600) e ipad.html (1024x768) con dati finti e salva gli screenshot.
// Uso:  NODE_PATH=$(npm root -g) node tools/mock-render.js [--overlay] [--out tools/out]
// --dry: renderizza solo galaxy-dry e ipad-dry.
// --half: salva anche <nome>-half.png, copia scalata al 50% (simula la distanza di lettura).
// --overlay: simula le scritte rosa di Fully senza licenza (solo Galaxy).
// Genera 6 immagini: galaxy/ipad x day/night (con pioggia, avvisi, agenda) + galaxy-dry/ipad-dry (giornata asciutta, niente avvisi).
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var pw = require('playwright');

var args = process.argv.slice(2);
var OVERLAY = args.indexOf('--overlay') >= 0;
var HALF = args.indexOf('--half') >= 0;
var ONLY_DRY = args.indexOf('--dry') >= 0;   // solo gli scenari puliti (asciutto, senza avvisi)
var oi = args.indexOf('--out');
var OUT = path.resolve(oi >= 0 ? args[oi + 1] : path.join(__dirname, 'out'));
var ROOT = path.resolve(__dirname, '..');
var TZ = 'Europe/Rome';
var LAT = 45.10345, LON = 11.79292;

// ---------- data "oggi" a Roma ----------
var parts = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()).split('-');
var Y = +parts[0], M = +parts[1], D = +parts[2];
function pad(n){ return (n < 10 ? '0' : '') + n; }
function dayStr(off){ var d = new Date(Date.UTC(Y, M - 1, D + off)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
var PHASES = [{name: 'day', h: 12, m: 15}, {name: 'night', h: 22, m: 30}];
var DRY = {name: 'dry', h: 12, m: 15, dry: true};
// epoch (ms) dell'ora locale di Roma Y-M-D h:m
function romeEpoch(h, m){
  var guess = Date.UTC(Y, M - 1, D, h, m), f = new Intl.DateTimeFormat('en-US', {timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'});
  var p = {}; f.formatToParts(new Date(guess)).forEach(function(x){ p[x.type] = +x.value; });
  return guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess);
}

// ---------- PNG minimale ----------
var CRC = (function(){ var t = [], n, c, k; for (n = 0; n < 256; n++){ c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc(buf){ var c = 0xFFFFFFFF; for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data){
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  var td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(w, h, px){
  var raw = Buffer.alloc((w * 4 + 1) * h), o = 0, x, y, p;
  for (y = 0; y < h; y++){ raw[o++] = 0; for (x = 0; x < w; x++){ p = px(x, y); raw[o++] = p[0]; raw[o++] = p[1]; raw[o++] = p[2]; raw[o++] = p[3]; } }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function worldPx(lat, lon, z){
  var n = 256 * Math.pow(2, z), s = Math.sin(lat * Math.PI / 180);
  return {x: (lon + 180) / 360 * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n};
}
var PIN = worldPx(LAT, LON, 8);   // z7 con tile 512 = stesso spazio pixel di z8 con tile 256
var cache = {};
function radarTile(tx, ty, frame){
  var key = tx + '_' + ty + '_' + frame;
  if (cache[key]) return cache[key];
  // macchia di pioggia a ovest/nord-ovest del pin, si sposta verso est a ogni fotogramma
  var cx = PIN.x - 110 + frame * 14 - tx * 512, cy = PIN.y - 40 + frame * 4 - ty * 512, R = 75;
  cache[key] = png(512, 512, function(x, y){
    var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
    if (d > R) return [0, 0, 0, 0];
    var f = d / R, col = f < 0.3 ? [229, 50, 45] : f < 0.55 ? [255, 210, 46] : f < 0.8 ? [47, 111, 224] : [127, 214, 245];
    return [col[0], col[1], col[2], 230];
  });
  return cache[key];
}
var BASE = png(256, 256, function(x, y){ return (x === 0 || y === 0) ? [60, 72, 90, 255] : [28, 36, 48, 255]; });
var EMPTY = png(256, 256, function(){ return [0, 0, 0, 0]; });

// ---------- Open-Meteo finto ----------
function meteo(now){
  var dry = !!now.dry;
  var times = [], temp = [], code = [], prob = [], prec = [], gust = [], cape = [], isDay = [], pres = [], i, h;
  var nowIdx = now.h;   // indice orario "adesso" (le ore partono da oggi 00:00)
  for (i = 0; i < 144; i++){
    h = i % 24;
    times.push(dayStr(Math.floor(i / 24)) + 'T' + pad(h) + ':00');
    temp.push(Math.round((15 + 7 * Math.sin((h - 9) / 24 * 2 * Math.PI) - 0.1 * Math.floor(i / 24)) * 10) / 10);
    var rel = i - nowIdx, c = h >= 7 && h < 19 ? 1 : 0, p = 5, mm = 0;
    if (!dry){
      if (rel >= 1 && rel <= 6){ c = rel === 3 ? 63 : 61; p = 70; mm = rel === 3 ? 3.4 : 1.2; }
      if (rel === 7){ c = 96; p = 60; mm = 2.1; }
      if (rel >= 12 && rel < 20) c = 3;
    }
    code.push(c); prob.push(p); prec.push(mm);
    gust.push(!dry && rel === 4 ? 65 : 14 + (i % 5) * 2);
    cape.push(!dry && rel >= 5 && rel <= 8 ? 800 : 50);
    isDay.push(h >= 8 && h < 19 ? 1 : 0);
    // pressione: in calo di 4 hPa nelle ultime 3 ore (dry: stabile, +1)
    pres.push(Math.round((dry ? 1016 + (i - nowIdx) / 3 : 1010 - 4 / 3 * (i - nowIdx)) * 10) / 10);
  }
  // nowcast 15 minuti: 12 passi dal quarto d'ora corrente, pioggia in arrivo tra 45 min (dal 4o passo)
  var q = [], qp = [], base = new Date(Date.UTC(Y, M - 1, D, 0, 0)), k;
  var slot0 = now.h * 4 + Math.floor(now.m / 15);
  for (k = 0; k < 12; k++){
    var sl = slot0 + k, hh = Math.floor(sl / 4) % 24, mi = (sl % 4) * 15, dd = Math.floor(sl / 96);
    q.push(dayStr(dd) + 'T' + pad(hh) + ':' + pad(mi));
    qp.push(!dry && k >= 3 && k <= 9 ? [0.3, 0.8, 1.4, 0.6, 0.2, 0.1, 0][Math.min(k - 3, 6)] : 0);
  }
  var sr = [], ss = [], dc = [], dmax = [], dmin = [], dp = [], dsum = [], dg = [], uv = [];
  var codes = dry ? [1, 1, 2, 3, 3, 2] : [1, 45, 45, 3, 3, 2], pm = dry ? [5, 10, 5, 15, 18, 28] : [70, 10, 5, 15, 18, 28], sm = dry ? [0, 0, 0, 0.2, 0.9, 0.3] : [8.2, 0, 0, 0.2, 0.9, 0.3];
  for (i = 0; i < 6; i++){
    sr.push(dayStr(i) + 'T07:27'); ss.push(dayStr(i) + 'T18:29'); dc.push(codes[i]);
    dmax.push([22, 23, 22, 21, 22, 22][i]); dmin.push([10, 10, 12, 13, 14, 12][i]);
    dp.push(pm[i]); dsum.push(sm[i]); dg.push(i === 0 && !dry ? 65 : 30); uv.push([4.2, 3.8, 3.1, 2.6, 2.9, 3.3][i]);
  }
  var qm = Math.floor(now.m / 15) * 15;
  return {
    current: {time: dayStr(0) + 'T' + pad(now.h) + ':' + pad(qm), temperature_2m: 18.4, apparent_temperature: 17.1,
      relative_humidity_2m: 62, weather_code: now.h >= 7 && now.h < 19 ? (dry ? 1 : 2) : 0, wind_speed_10m: 9, wind_direction_10m: 200, wind_gusts_10m: 21, is_day: now.h >= 8 && now.h < 19 ? 1 : 0},
    hourly: {time: times, temperature_2m: temp, weather_code: code, precipitation_probability: prob, precipitation: prec, wind_gusts_10m: gust, cape: cape, is_day: isDay, pressure_msl: pres},
    minutely_15: {time: q, precipitation: qp},
    daily: {time: [0, 1, 2, 3, 4, 5].map(dayStr), weather_code: dc, temperature_2m_max: dmax, temperature_2m_min: dmin,
      precipitation_probability_max: dp, precipitation_sum: dsum, wind_gusts_10m_max: dg, sunrise: sr, sunset: ss, uv_index_max: uv}
  };
}
function airQuality(){
  return {current: {time: dayStr(0) + 'T12:00', european_aqi: 34, pm2_5: 8.4, alder_pollen: null, birch_pollen: null, grass_pollen: 25, olive_pollen: 0, ragweed_pollen: 2}};
}

// ---------- gviz finto ----------
function cell(v, f){ return f === undefined ? {v: v} : {v: v, f: f}; }
function dcell(s){ var a = s.split('-'); return cell('Date(' + a[0] + ',' + (+a[1] - 1) + ',' + (+a[2]) + ')', s); }
function tcell(s){ if (!s) return null; var a = s.split(':'); return cell('Date(1899,11,30,' + (+a[0]) + ',' + (+a[1]) + ',0)', s); }
function gviz(cb, rows){
  var body = {version: '0.6', status: 'ok', table: {cols: [], rows: rows.map(function(r){ return {c: r}; })}};
  return '/*O_o*/\n' + cb + '(' + JSON.stringify(body) + ');';
}
function sportRows(){
  return [
    [cell('MILAN'), cell('Salisburgo – Milan'), dcell(dayStr(1)), tcell('18:45'), cell('Europa League'), cell('Sky · NOW'), null],
    [cell('F1'), cell('GP USA · Qualifiche'), dcell(dayStr(3)), tcell('23:00'), cell(''), cell('Sky · TV8 diff.'), null],
    [cell('ITALIA'), cell('Italia – Francia'), dcell(dayStr(6)), tcell('20:45'), cell('Amichevole'), cell('Rai 1'), null]
  ];
}
function agendaRows(){
  // oggi: 1 tutto il giorno + 3 con orario + 1 gia' finito; domani e dopodomani NON devono comparire
  return [
    [cell('Giornata del nonno'), dcell(dayStr(0)), null, null, cell('Festività'), null],
    [cell('Cena da Diego'), dcell(dayStr(0)), tcell('21:00'), tcell('23:00'), cell('Personale'), null],
    [cell('Allenamento ritmica'), dcell(dayStr(0)), tcell('18:30'), tcell('20:00'), cell('Famiglia'), null],
    [cell('Chiamare gli zii'), dcell(dayStr(0)), tcell('22:45'), null, cell('Personale'), null],
    [cell('Visita dentista'), dcell(dayStr(1)), tcell('09:00'), tcell('10:00'), cell('Famiglia'), null],
    [cell('Ponte di Ognissanti'), dcell(dayStr(2)), null, null, cell('Festività'), null],
    [cell('Evento già finito'), dcell(dayStr(0)), tcell('08:00'), tcell('09:00'), cell('Personale'), null]
  ];
}
function jolpica(){
  return {MRData: {RaceTable: {Races: [{raceName: 'United States Grand Prix', date: dayStr(4), time: '20:00:00Z',
    Qualifying: {date: dayStr(3), time: '21:00:00Z'}}]}}};
}

// ---------- rendering ----------
var CORS = {'access-control-allow-origin': '*'};
async function setupRoutes(page){
  await page.route(function(u){ return u.protocol !== 'file:'; }, function(r){ r.abort(); });
  // air-quality-api.open-meteo.com va gestito a parte rispetto a api.open-meteo.com
  await page.route(/air-quality-api\.open-meteo\.com/, function(r){ r.fulfill({status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(airQuality())}); });
  await page.route(/\/\/api\.open-meteo\.com/, function(r){ r.fulfill({status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(page.__meteo)}); });
  await page.route(/jolpi\.ca/, function(r){ r.fulfill({status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(jolpica())}); });
  await page.route(/docs\.google\.com\/spreadsheets/, function(r){
    var isAg = /sheet=Agenda/.test(r.request().url());
    r.fulfill({status: 200, contentType: 'text/javascript', body: isAg ? gviz('agendaCb', agendaRows()) : gviz('sportCb', sportRows())});
  });
  await page.route(/rainviewer\.com/, function(r){
    var u = r.request().url(), m;
    if (/weather-maps\.json/.test(u)){
      var past = [], nowS = Math.floor(page.__epoch / 1000) - 12 * 60;   // ultimo fotogramma di 12 min fa
      for (var i = 0; i < 13; i++) past.push({time: nowS - (12 - i) * 600, path: '/v2/radar/f' + i});
      r.fulfill({status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({version: '2.0', generated: nowS, host: 'https://tilecache.rainviewer.com', radar: {past: past, nowcast: []}})});
    } else if ((m = u.match(/\/v2\/radar\/f(\d+)\/512\/7\/(\d+)\/(\d+)\//))){
      r.fulfill({status: 200, contentType: 'image/png', headers: CORS, body: radarTile(+m[2], +m[3], +m[1] - 6)});
    } else r.fulfill({status: 404, body: ''});
  });
  await page.route(/arcgisonline\.com/, function(r){
    r.fulfill({status: 200, contentType: 'image/png', headers: CORS, body: /Reference/.test(r.request().url()) ? EMPTY : BASE});
  });
}

// ---------- controlli eseguiti nella pagina ----------
// opts: {tiles, minPx (testo HTML), minSvg (altezza testo SVG del grafico)}
function check(opts){
  var problems = [], warns = [];
  function nm(e){ return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : ''); }
  var de = document.documentElement, W = window.innerWidth, H = window.innerHeight;
  if (de.scrollWidth > de.clientWidth + 1) problems.push('overflow orizzontale documento ' + de.scrollWidth + ' > ' + de.clientWidth);
  if (de.scrollHeight > de.clientHeight + 1) problems.push('overflow verticale documento ' + de.scrollHeight + ' > ' + de.clientHeight);
  var boxes = document.querySelectorAll('#app, .main, .left, .right, .top, .bot, .rcol, .card, .tile, .box, .tiles, .cols, .colA, .colB');
  var i;
  for (i = 0; i < boxes.length; i++){
    var b = boxes[i];
    if (b.scrollHeight > b.clientHeight + 1) problems.push(nm(b) + ' scrollHeight ' + b.scrollHeight + ' > clientHeight ' + b.clientHeight);
    if (b.scrollWidth > b.clientWidth + 1) problems.push(nm(b) + ' scrollWidth ' + b.scrollWidth + ' > clientWidth ' + b.clientWidth);
  }
  // elementi visibili fuori dallo schermo (esclusi interni di radar e svg)
  var all = document.body.querySelectorAll('*');
  for (i = 0; i < all.length; i++){
    var e = all[i];
    if (e.id === 'shade' || e.tagName === 'SCRIPT' || e.closest('.radar') || e.closest('svg') || e.closest('#fully-overlay')) continue;
    var r = e.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.bottom > H + 1 || r.right > W + 1 || r.left < -1 || r.top < -1) problems.push(nm(e) + ' fuori schermo (' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom) + ')');
  }
  // testo tagliato (nowrap + overflow hidden); le ellissi di agenda e avvisi sono volute
  var tr = document.querySelectorAll('.ag .aw, .s1, .s1 .w, .s2, .meta, .feel, .sunrow, .date, .desc, .dc .t, .dc .n, .dc .p, .dr span, .stale, .temp, .tl, .tv, .tn, .rl, .rleg, .al i');
  for (i = 0; i < tr.length; i++) if (tr[i].scrollWidth > tr[i].clientWidth + 1) warns.push('testo tagliato: ' + nm(tr[i]) + ' "' + tr[i].textContent.substr(0, 40) + '"');
  var cut = document.querySelectorAll('.ag .at, .al span, .s1 .w'), nc = 0;
  for (i = 0; i < cut.length; i++) if (cut[i].scrollWidth > cut[i].clientWidth + 1) nc++;
  // etichette del grafico: dentro il viewBox e mai sovrapposte
  var svg = document.querySelector('#chart svg'), svgTexts = [];
  if (svg){
    var vb = svg.viewBox.baseVal, ts = svg.querySelectorAll('text:not(.halo)'), bbs = [];
    for (i = 0; i < ts.length; i++){
      var bb = ts[i].getBBox();
      bbs.push(bb);
      if (bb.x < -0.5 || bb.y < -0.5 || bb.x + bb.width > vb.width + 0.5 || bb.y + bb.height > vb.height + 0.5)
        problems.push('grafico: etichetta fuori dal viewBox "' + ts[i].textContent + '" (' + Math.round(bb.x) + ',' + Math.round(bb.y) + ',' + Math.round(bb.x + bb.width) + ',' + Math.round(bb.y + bb.height) + ' / ' + vb.width + 'x' + vb.height + ')');
    }
    for (i = 0; i < bbs.length; i++) for (var j = i + 1; j < bbs.length; j++){
      var p = bbs[i], q = bbs[j];
      if (p.x < q.x + q.width - 1 && p.x + p.width > q.x + 1 && p.y < q.y + q.height - 2 && p.y + p.height > q.y + 2)
        problems.push('grafico: etichette sovrapposte "' + ts[i].textContent + '" e "' + ts[j].textContent + '"');
    }
    var sr = svg.getBoundingClientRect(); if (sr.height < 20) problems.push('grafico troppo basso');
  } else problems.push('grafico assente');
  // avvisi e tessere mai sotto le scritte di Fully; radar: etichette solo avviso
  var ov = document.querySelectorAll('#fully-overlay, #fully-overlay2'), inter = function(a, b){ return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; };
  for (var o = 0; o < ov.length; o++){
    var orc = ov[o].getBoundingClientRect(), hit = document.querySelectorAll('.al, .tile, #days, .ag, .s, .rl, .rleg');
    for (i = 0; i < hit.length; i++) if (inter(hit[i].getBoundingClientRect(), orc)){
      var msg = nm(hit[i]) + ' sotto la scritta di Fully (' + ov[o].id + ')';
      if (hit[i].className === 'rl' || hit[i].className === 'rleg') warns.push(msg); else problems.push(msg);
    }
  }
  var hid = document.querySelectorAll('#sport .s2'), nh = 0;
  for (i = 0; i < hid.length; i++) if (getComputedStyle(hid[i]).display === 'none') nh++;
  if (nh) problems.push('sport: ' + nh + ' seconda riga (orario) nascosta per mancanza di spazio');
  var nt = document.querySelectorAll('#tiles .tile').length; if (nt !== opts.tiles) problems.push('tessere meteorologo: ' + nt + ' invece di ' + opts.tiles);
  var na = document.querySelectorAll('#agenda .ag:not(.none)').length, ns = document.querySelectorAll('#sport .s').length;
  if (na > 3) problems.push('agenda oggi: ' + na + ' righe (>3)');
  if (ns > 2) problems.push('sport: ' + ns + ' righe (>2)');
  if (document.querySelector('#radar .fr') === null) problems.push('radar: nessun fotogramma');
  var rt = document.getElementById('rTime'); if (!rt || !/min fa|adesso/.test(rt.textContent)) problems.push('radar: etichetta eta\' mancante');

  // ---- testi visibili: dimensione minima + dati per il contrasto ----
  function parse(c){ var m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; var a = m[1].split(/[ ,\/]+/).map(parseFloat); return [a[0], a[1], a[2], a.length > 3 ? a[3] : 1]; }
  var items = [], minSeen = 999, sizeViol = [];
  for (i = 0; i < all.length; i++){
    var el = all[i], tg = el.tagName.toLowerCase();
    if (tg === 'script' || tg === 'style' || el.closest('#shade') || el.closest('#fully-overlay') || el.closest('#fully-overlay2') || el.closest('.ra') || (el.getAttribute && /(^| )halo( |$)/.test(el.getAttribute('class') || ''))) continue;
    var tn = [], k;
    for (k = 0; k < el.childNodes.length; k++) if (el.childNodes[k].nodeType === 3 && /\S/.test(el.childNodes[k].nodeValue)) tn.push(el.childNodes[k]);
    if (!tn.length) continue;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, rg = document.createRange();
    for (k = 0; k < tn.length; k++){ rg.selectNode(tn[k]); var rr = rg.getBoundingClientRect(); if (rr.width < 0.5 || rr.height < 0.5) continue;
      x0 = Math.min(x0, rr.left); y0 = Math.min(y0, rr.top); x1 = Math.max(x1, rr.right); y1 = Math.max(y1, rr.bottom); }
    if (x1 < x0) continue;
    var er = el.getBoundingClientRect();
    x0 = Math.max(x0, er.left); x1 = Math.min(x1, er.right); y0 = Math.max(y0, er.top); y1 = Math.min(y1, er.bottom);
    if (x1 - x0 < 1 || y1 - y0 < 1) continue;
    var isSvg = !!el.closest('svg'), fs = parseFloat(cs.fontSize), measure = isSvg ? er.height : fs, label = nm(el) + ' "' + el.textContent.trim().substr(0, 30) + '"';
    if (isSvg){ if (measure < opts.minSvg) sizeViol.push(label + ' altezza ' + measure.toFixed(1) + 'px < ' + opts.minSvg); }
    else if (measure < opts.minPx) sizeViol.push(label + ' font ' + measure.toFixed(1) + 'px < ' + opts.minPx);
    if (measure < minSeen) minSeen = measure;
    items.push({label: label, color: parse(isSvg ? cs.fill : cs.color), fs: fs, weight: parseInt(cs.fontWeight, 10) || 400,
      x: x0, y: y0, w: x1 - x0, h: y1 - y0, skip: !!el.closest('#colon')});
  }
  sizeViol.forEach(function(v){ problems.push('FONT TROPPO PICCOLO: ' + v); });

  // ---- spazio sprecato: card con piu' del 25% di altezza vuota sotto l'ultimo contenuto ----
  var cards = document.querySelectorAll('.card'), waste = [];
  for (i = 0; i < cards.length; i++){
    var cd = cards[i];
    if (cd.classList.contains('chartcard')) continue;
    var cr = cd.getBoundingClientRect(), maxB = cr.top, de2 = cd.querySelectorAll('*');
    for (k = 0; k < de2.length; k++){
      var d2 = de2[k], t2 = d2.tagName.toLowerCase(), own = false, m;
      for (m = 0; m < d2.childNodes.length; m++) if (d2.childNodes[m].nodeType === 3 && /\S/.test(d2.childNodes[m].nodeValue)) own = true;
      if (!own && t2 !== 'svg' && t2 !== 'img') continue;
      var dr2 = d2.getBoundingClientRect(); if (dr2.height < 1) continue;
      if (dr2.bottom > maxB) maxB = dr2.bottom;
    }
    var frac = (cr.bottom - maxB) / cr.height;
    if (frac > 0.25) waste.push(nm(cd) + ' vuoto ' + Math.round(frac * 100) + '% (' + Math.round(cr.bottom - maxB) + 'px su ' + Math.round(cr.height) + ')');
  }
  waste.forEach(function(w){ problems.push('SPAZIO SPRECATO: ' + w); });

  var rad = document.getElementById('radar');
  return {problems: problems, warns: warns, items: items, minSeen: minSeen, ellissi: nc,
    info: 'agenda ' + na + ' | sport ' + ns + ' | radar "' + (rt ? rt.textContent : '') + '" | ' + rad.offsetWidth + 'x' + rad.offsetHeight + ' | chart ' + (svg ? svg.getBoundingClientRect().width + 'x' + svg.getBoundingClientRect().height : '-')};
}

// campiona lo sfondo dietro ogni testo dallo screenshot a testo trasparente e calcola il rapporto WCAG
async function contrast(page, shot, items){
  return page.evaluate(async function(a){
    function lin(v){ v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    function lum(c){ return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
    function med(arr){ arr.sort(function(x, y){ return x - y; }); return arr[Math.floor(arr.length / 2)]; }
    var img = new Image();
    await new Promise(function(res, rej){ img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + a.b64; });
    var cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    var out = [];
    a.items.forEach(function(it){
      if (it.skip || !it.color) return;
      var x = Math.max(0, Math.floor(it.x)), y = Math.max(0, Math.floor(it.y)), w = Math.min(cv.width - x, Math.ceil(it.w)), h = Math.min(cv.height - y, Math.ceil(it.h));
      if (w < 1 || h < 1) return;
      var d = cx.getImageData(x, y, w, h).data, R = [], G = [], B = [], step = Math.max(1, Math.floor(Math.sqrt(w * h / 3000)));
      for (var yy = 0; yy < h; yy += step) for (var xx = 0; xx < w; xx += step){ var o = (yy * w + xx) * 4; R.push(d[o]); G.push(d[o + 1]); B.push(d[o + 2]); }
      var bg = [med(R), med(G), med(B)], al = it.color[3], fg = [0, 1, 2].map(function(k){ return it.color[k] * al + bg[k] * (1 - al); });
      var l1 = lum(fg), l2 = lum(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      var large = (it.fs >= 24 && it.weight >= 700) || it.fs >= 32, need = large ? 3 : 4.5;
      out.push({label: it.label, ratio: ratio, need: need, fg: fg.map(Math.round).join(','), bg: bg.join(','), fs: it.fs});
    });
    return out;
  }, {b64: shot.toString('base64'), items: items});
}

async function renderOne(browser, file, w, h, ph, overlay){
  var ctx = await browser.newContext({viewport: {width: w, height: h}, timezoneId: TZ, locale: 'it-IT', deviceScaleFactor: 1});
  var page = await ctx.newPage();
  page.__meteo = meteo(ph); page.__epoch = romeEpoch(ph.h, ph.m);
  page.on('pageerror', function(e){ console.log('  [pageerror] ' + e.message); });
  await setupRoutes(page);
  // orologio finto: la data resta quella di oggi, l'ora e' quella della fase
  await page.addInitScript(function(a){
    var Real = Date, off = new Real(a.y, a.mo - 1, a.d, a.h, a.m, 0).getTime() - Real.now();
    function Fake(){
      var args = Array.prototype.slice.call(arguments);
      if (args.length === 0) return new Real(Real.now() + off);
      return new (Function.prototype.bind.apply(Real, [null].concat(args)))();
    }
    Fake.prototype = Real.prototype; Fake.now = function(){ return Real.now() + off; };
    Fake.UTC = Real.UTC; Fake.parse = Real.parse;
    window.Date = Fake;
  }, {y: Y, mo: M, d: D, h: ph.h, m: ph.m});
  await page.goto('file://' + path.join(ROOT, file));
  if (overlay){
    await page.evaluate(function(){
      var css = 'position:fixed;z-index:50;pointer-events:none;font-weight:700;font-size:6.2vh;line-height:1;white-space:nowrap;color:rgba(255,120,180,.55);';
      var a = document.createElement('div'); a.id = 'fully-overlay'; a.textContent = 'PLUS Features Activated';
      a.style.cssText = css + 'left:45%;top:5%;';
      var b = document.createElement('div'); b.id = 'fully-overlay2'; b.textContent = 'Please Get a License';
      b.style.cssText = css + 'left:2%;top:88%;';
      document.body.appendChild(a); document.body.appendChild(b);
    });
  }
  await page.waitForTimeout(3500);
  var name = file.replace('.html', '') === 'index' ? 'galaxy' : 'ipad';
  var png = path.join(OUT, name + '-' + ph.name + '.png');
  var shot = await page.screenshot({path: png});
  var isG = name === 'galaxy';
  var res = await page.evaluate(check, {tiles: isG ? 3 : 4, minPx: isG ? 22 : 24.5, minSvg: isG ? 18 : 20});
  // screenshot con testo trasparente: serve per misurare lo sfondo reale dietro ogni scritta
  await page.addStyleTag({content: '* { color: transparent !important; text-shadow: none !important; } svg text { fill: transparent !important; } #fully-overlay, #fully-overlay2 { display: none !important; }'});
  var shot2 = await page.screenshot();
  var cr = await contrast(page, shot2, res.items), lowest = 99, nlow = 0;
  cr.forEach(function(c){
    if (c.ratio < lowest) lowest = c.ratio;
    if (c.ratio < c.need){ nlow++; res.problems.push('CONTRASTO ' + c.ratio.toFixed(2) + ':1 < ' + c.need + ' ' + c.label + ' testo rgb(' + c.fg + ') sfondo rgb(' + c.bg + ') ' + c.fs.toFixed(0) + 'px'); }
  });
  if (HALF){
    var p2 = await ctx.newPage();
    await p2.setViewportSize({width: w / 2, height: h / 2});
    await p2.setContent('<body style="margin:0;background:#000"><img style="display:block" width="' + (w / 2) + '" height="' + (h / 2) + '" src="data:image/png;base64,' + shot.toString('base64') + '"></body>');
    await p2.waitForTimeout(200);
    await p2.screenshot({path: path.join(OUT, name + '-' + ph.name + '-half.png')});
    await p2.close();
  }
  console.log(name + ' ' + ph.name + ' (' + w + 'x' + h + ')' + (overlay ? ' +overlay' : '') + ' -> ' + png);
  console.log('  ' + res.info);
  console.log('  testo piu\' piccolo: ' + res.minSeen.toFixed(1) + 'px | contrasto piu\' basso: ' + lowest.toFixed(2) + ':1 su ' + cr.length + ' testi | ellissi volute: ' + res.ellissi);
  var low = cr.slice().sort(function(a, b){ return a.ratio - b.ratio; }).slice(0, 2);
  low.forEach(function(c){ console.log('    piu\' basso: ' + c.ratio.toFixed(2) + ':1 ' + c.label + ' testo rgb(' + c.fg + ') su rgb(' + c.bg + ')'); });
  STATS.minPx[name] = Math.min(STATS.minPx[name] || 999, res.minSeen);
  STATS.minCr = Math.min(STATS.minCr, lowest);
  res.problems.forEach(function(p){ console.log('  PROBLEMA: ' + p); });
  res.warns.forEach(function(p){ console.log('  avviso: ' + p); });
  if (!res.problems.length) console.log('  controlli (overflow, font minimo, contrasto, spazio): ok');
  await ctx.close();
  return res.problems.length;
}
var STATS = {minPx: {}, minCr: 99};

(async function(){
  fs.mkdirSync(OUT, {recursive: true});
  var browser = await pw.chromium.launch();
  var bad = 0, i;
  var SC = ONLY_DRY ? [DRY] : PHASES.concat([DRY]);
  for (i = 0; i < SC.length; i++) bad += await renderOne(browser, 'index.html', 1024, 600, SC[i], OVERLAY);
  for (i = 0; i < SC.length; i++) bad += await renderOne(browser, 'ipad.html', 1024, 768, SC[i], false);
  await browser.close();
  console.log('Font piu\' piccolo: Galaxy ' + (STATS.minPx.galaxy || 0).toFixed(1) + 'px, iPad ' + (STATS.minPx.ipad || 0).toFixed(1) + 'px | contrasto piu\' basso ' + STATS.minCr.toFixed(2) + ':1');
  console.log(bad ? 'TOTALE PROBLEMI: ' + bad : 'Nessun problema rilevato');
  process.exit(bad ? 1 : 0);
})().catch(function(e){ console.error(e); process.exit(2); });
