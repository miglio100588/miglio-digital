// ===== CONFIG =====
var LAT = 45.10345, LON = 11.79292, CITY = 'Boara Polesine';   // posizione del tablet (meteo + centro radar)
var RADAR_REFRESH_MIN = 15;          // radar statico: solo l'ultimo fotogramma, aggiornato ogni 15 min
var RADAR_FRAMES = 1;
var REFRESH_MIN = 15;               // aggiornamento meteo
var SHEET_ID = '1Vyjea-9AzZGETDihlg3CWY4TMPLNdmLtUFvVvVxDaUc'; // foglio "Tablet Meteo – Sport"
var SPORT_REFRESH_MIN = 30;
var LAYOUT = window.LAYOUT || {};   // definito dalla pagina (index.html / ipad.html) prima di app.js
function lay(k, d){ return LAYOUT[k] === undefined ? d : LAYOUT[k]; }
var SAFE_ZONES = !!lay('safe', false);   // lascia libere le zone delle scritte di Fully (false se hai la licenza)
var AGENDA_MAX = lay('agendaMax', 3), CHART_HOURS = lay('chartHours', 25), DAYS = lay('days', 6);
var AQ_REFRESH_MIN = 60;            // qualità dell'aria e pollini
var DEEP_NIGHT_FROM = 23, DEEP_NIGHT_TO = 6; // schermo più scuro
var SHADE = {day: 0, golden: 0, dawn: 0.1, dusk: 0.15, night: 0.3, deep: 0.55};
var BRIGHT = {day: 200, golden: 170, dawn: 110, dusk: 90, night: 50, deep: 12}; // solo se attiva la JS API di Fully
// ==================

var Q = '/v1/forecast?latitude=' + LAT + '&longitude=' + LON +
  '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day' +
  '&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_gusts_10m,cape,is_day,pressure_msl' +
  '&minutely_15=precipitation&forecast_minutely_15=12' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max,sunrise,sunset,uv_index_max' +
  '&timezone=Europe%2FRome&forecast_days=6';
var QA = '/v1/air-quality?latitude=' + LAT + '&longitude=' + LON +
  '&current=european_aqi,pm2_5,alder_pollen,birch_pollen,grass_pollen,olive_pollen,ragweed_pollen&timezone=Europe%2FRome';
var AQ_HOSTS = ['https://air-quality-api.open-meteo.com', 'http://air-quality-api.open-meteo.com'];
var HOSTS = ['https://api.open-meteo.com', 'http://api.open-meteo.com'];
var hostIdx = 0;

var GIORNI = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
var GG = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
var MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

function $(id){ return document.getElementById(id); }
function pad(n){ return (n < 10 ? '0' : '') + n; }
function hm(s){ return s.substr(11, 5); }
function hm2(d){ return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function loc(s){ var a = s.split('T'), d = a[0].split('-'), t = (a[1] || '00:00').split(':');
  return new Date(+d[0], +d[1] - 1, +d[2], +t[0], +t[1]); }
function dur(ms){ var m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60);
  return (h ? h + 'h ' : '') + pad(m % 60) + 'm'; }

function desc(c){
  if (c === 0) return 'Sereno';
  if (c === 1) return 'Poco nuvoloso';
  if (c === 2) return 'Parzialmente nuvoloso';
  if (c === 3) return 'Coperto';
  if (c === 45 || c === 48) return 'Nebbia';
  if (c >= 51 && c <= 55) return 'Pioviggine';
  if (c === 56 || c === 57) return 'Pioviggine gelata';
  if (c === 61) return 'Pioggia debole';
  if (c === 63) return 'Pioggia';
  if (c === 65) return 'Pioggia forte';
  if (c === 66 || c === 67) return 'Pioggia gelata';
  if (c >= 71 && c <= 75) return 'Neve';
  if (c === 77) return 'Nevischio';
  if (c >= 80 && c <= 82) return 'Rovesci';
  if (c === 85 || c === 86) return 'Rovesci di neve';
  if (c === 95) return 'Temporale';
  if (c === 96 || c === 99) return 'Temporale con grandine';
  return '—';
}
function card(deg){ var d = ['N','NE','E','SE','S','SO','O','NO']; return d[Math.round(deg / 45) % 8]; }

// ---- icone SVG ----
function sunI(cx, cy, r){
  var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#FFC93C"/>';
  for (var i = 0; i < 8; i++){
    var a = i * Math.PI / 4, c = Math.cos(a), n = Math.sin(a);
    s += '<line x1="' + (cx + c * (r + 4)) + '" y1="' + (cy + n * (r + 4)) + '" x2="' + (cx + c * (r + 9)) + '" y2="' + (cy + n * (r + 9)) +
         '" stroke="#FFC93C" stroke-width="3" stroke-linecap="round"/>';
  }
  return s;
}
function moonI(cx, cy, r){
  cx = cx + r * 0.3;
  return '<path d="M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 0 0 ' + cx + ' ' + (cy + r) +
         ' A' + (r * 1.25) + ' ' + (r * 1.25) + ' 0 0 1 ' + cx + ' ' + (cy - r) + 'z" fill="#F4E7B0"/>';
}
function cloud(dy, col){
  return '<path transform="translate(0,' + dy + ')" d="M20 48h26a11 11 0 0 0 1-22a15 15 0 0 0-28-2a12 12 0 0 0 1 24z" fill="' + (col || '#E6EDF5') + '"/>';
}
function drops(){ return '<g stroke="#7CC4FF" stroke-width="3" stroke-linecap="round"><line x1="24" y1="46" x2="21" y2="55"/><line x1="34" y1="46" x2="31" y2="55"/><line x1="44" y1="46" x2="41" y2="55"/></g>'; }
function flakes(){ return '<g fill="#FFFFFF"><circle cx="23" cy="50" r="2.6"/><circle cx="33" cy="55" r="2.6"/><circle cx="43" cy="50" r="2.6"/></g>'; }
function hail(){ return '<g fill="#DDF3FF" stroke="#7CC4FF" stroke-width="1"><circle cx="24" cy="51" r="3.2"/><circle cx="35" cy="56" r="3.2"/><circle cx="45" cy="50" r="3.2"/></g>'; }
function bolt(){ return '<polygon points="33,42 25,54 32,54 28,63 40,49 33,49 37,42" fill="#FFD84D"/>'; }
function iconSvg(c, day){
  var b;
  if (c === 0) b = day ? sunI(32, 32, 12) : moonI(32, 32, 14);
  else if (c === 1 || c === 2) b = (day ? sunI(22, 22, 9) : moonI(22, 22, 10)) + cloud(4);
  else if (c === 3) b = cloud(-4);
  else if (c === 45 || c === 48)
    b = '<g stroke="#D5DEE8" stroke-width="4" stroke-linecap="round"><line x1="12" y1="24" x2="52" y2="24"/><line x1="8" y1="33" x2="48" y2="33"/><line x1="16" y1="42" x2="56" y2="42"/><line x1="12" y1="51" x2="44" y2="51"/></g>';
  else if ((c >= 71 && c <= 77) || c === 85 || c === 86) b = cloud(-8) + flakes();
  else if (c === 96 || c === 99) b = cloud(-8, '#AEB9C6') + hail();
  else if (c >= 95) b = cloud(-8, '#AEB9C6') + bolt();
  else if (c >= 51) b = cloud(-8) + drops();
  else b = cloud(-4);
  return b;
}
function icon(c, day){ return '<svg class="ic" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' + iconSvg(c, day) + '</svg>'; }

// ===== DAYLIGHT: fase del giorno, sfondo, luminosità =====
var SUN = {}, lastMin = -1, phase = '';
function getPhase(now){
  if (!SUN.rise){ var h = now.getHours(); return h >= 7 && h < 18 ? 'day' : 'night'; }
  var t = now.getTime(), r = SUN.rise.getTime(), s = SUN.set.getTime(), M = 60000;
  if (t >= r - 60 * M && t < r + 45 * M) return 'dawn';
  if (t >= r + 45 * M && t < s - 75 * M) return 'day';
  if (t >= s - 75 * M && t < s) return 'golden';
  if (t >= s && t < s + 60 * M) return 'dusk';
  return 'night';
}
function applyPhase(now){
  var p = getPhase(now), h = now.getHours();
  var deep = p === 'night' && (DEEP_NIGHT_FROM > DEEP_NIGHT_TO ? (h >= DEEP_NIGHT_FROM || h < DEEP_NIGHT_TO) : (h >= DEEP_NIGHT_FROM && h < DEEP_NIGHT_TO));
  var key = deep ? 'deep' : p;
  document.body.className = 'p-' + p + (SAFE_ZONES ? ' safe' : '');
  if ($('shade')) $('shade').style.opacity = SHADE[key];
  if (key !== phase){
    phase = key;
    try { if (window.fully && fully.setScreenBrightness) fully.setScreenBrightness(BRIGHT[key]); } catch (e) {}
  }
}

// colore in base alla temperatura (viola <=0, azzurro 5, verde acqua 15, giallo 22, arancio 30+)
var TSTOPS = [[0, [155, 140, 255]], [5, [124, 196, 255]], [15, [123, 224, 195]], [22, [255, 209, 102]], [30, [255, 138, 76]]];
function tempRGB(t){
  var i, a, b, f;
  if (t <= TSTOPS[0][0]) return TSTOPS[0][1];
  if (t >= TSTOPS[TSTOPS.length - 1][0]) return TSTOPS[TSTOPS.length - 1][1];
  for (i = 1; i < TSTOPS.length; i++) if (t <= TSTOPS[i][0]){
    a = TSTOPS[i - 1]; b = TSTOPS[i]; f = (t - a[0]) / (b[0] - a[0]);
    return [Math.round(a[1][0] + (b[1][0] - a[1][0]) * f), Math.round(a[1][1] + (b[1][1] - a[1][1]) * f), Math.round(a[1][2] + (b[1][2] - a[1][2]) * f)];
  }
  return TSTOPS[0][1];
}
function tempCol(t, al){ var c = tempRGB(t); return al === undefined ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + al + ')'; }

// fase lunare calcolata in locale (ciclo sinodico, luna nuova di riferimento 6/1/2000 18:14 UTC)
function moonPhase(now){
  var SYN = 29.53059, days = (now.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  var p = (days % SYN) / SYN; if (p < 0) p += 1;
  return {p: p, lit: Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100)};
}
function moonSvg(p){
  var r = 18, cx = 20, cy = 20, th = 2 * Math.PI * p, c = Math.cos(th), rx = (r * Math.abs(c)).toFixed(2), wax = p < 0.5;
  var s = '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="20" cy="20" r="18" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.35)" stroke-width="1"/>';
  var outer = wax ? 1 : 0, inner = wax ? (c > 0 ? 0 : 1) : (c > 0 ? 1 : 0);
  if (p > 0.004 && p < 0.996)
    s += '<path d="M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 0 ' + outer + ' ' + cx + ' ' + (cy + r) +
         ' A' + rx + ' ' + r + ' 0 0 ' + inner + ' ' + cx + ' ' + (cy - r) + 'z" fill="#F4E7B0"/>';
  return s + '</svg>';
}
function drawMoon(now){
  if (!$('moon')) return;
  var m = moonPhase(now);
  $('moon').innerHTML = moonSvg(m.p) + '<div class="mp">' + m.lit + '%</div>';
}

function drawSun(){
  var now = new Date();
  applyPhase(now);
  drawMoon(now);
  if (!SUN.rise || !$('sunSvg')) return;
  var isDay = now >= SUN.rise && now < SUN.set, a, b;
  if (isDay){ a = SUN.rise; b = SUN.set; }
  else if (now >= SUN.set){ a = SUN.set; b = SUN.rise2; }
  else { a = SUN.set0; b = SUN.rise; }
  var f = Math.min(1, Math.max(0, (now - a) / (b - a)));
  var x = 100 - 85 * Math.cos(Math.PI * f), y = 62 - 50 * Math.sin(Math.PI * f);
  var done = 'M15 62 A85 50 0 0 1 ' + x.toFixed(1) + ' ' + y.toFixed(1);
  var body = isDay
    ? '<circle cx="' + x + '" cy="' + y + '" r="12" fill="#FFC93C" opacity=".3"/><circle cx="' + x + '" cy="' + y + '" r="7" fill="#FFC93C"/>'
    : '<path d="M' + (x + 2) + ' ' + (y - 7) + ' A7 7 0 1 0 ' + (x + 2) + ' ' + (y + 7) + ' A9 9 0 0 1 ' + (x + 2) + ' ' + (y - 7) + 'z" fill="#F4E7B0"/>';
  $('sunSvg').innerHTML = '<svg viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg">' +
    '<line x1="4" y1="62" x2="196" y2="62" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>' +
    '<path d="M15 62 A85 50 0 0 1 185 62" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2.5"' + (isDay ? '' : ' stroke-dasharray="3 5"') + '/>' +
    (isDay && f > 0.005 ? '<path d="' + done + '" fill="none" stroke="#FFC93C" stroke-width="3.5" stroke-linecap="round"/>' : '') +
    body + '</svg>';
  var tra = lay('shortSun', false) ? ' ' : ' tra ';
  if ($('sunRow')) $('sunRow').innerHTML = isDay
    ? '<span><b>' + hm2(SUN.rise) + '</b></span><span>tramonto' + tra + '<b>' + dur(SUN.set - now) + '</b></span><span><b>' + hm2(SUN.set) + '</b></span>'
    : '<span><b>' + hm2(a) + '</b></span><span>alba' + tra + '<b>' + dur(b - now) + '</b></span><span><b>' + hm2(b) + '</b></span>';
}

var colonOn = true;
function tick(){
  var n = new Date(), on = n.getSeconds() % 2 === 0;
  if (n.getMinutes() !== lastMin){
    lastMin = n.getMinutes();
    if ($('clock')) $('clock').innerHTML = pad(n.getHours()) + '<span id="colon" class="colon">:</span>' + pad(n.getMinutes());
    colonOn = true;
    if ($('date')) $('date').innerHTML = GIORNI[n.getDay()] + ' ' + n.getDate() + ' ' + MESI[n.getMonth()];
    drawSun(); renderAlerts(); renderAgenda(); renderTiles(); radarCheck();
  }
  if (on !== colonOn && $('colon')){ colonOn = on; $('colon').className = on ? 'colon' : 'colon dim'; }
}

// ===== METEO =====
var wxAlerts = [], WX = null, AQ = null;
function chart(H, start){
  var el = $('chart'), W = 600, Ht = 190, L = 14, R = 14, TOP = 42, BOT, N = CHART_HOURS, i;
  if (el && el.offsetWidth > 50){ W = el.offsetWidth; Ht = Math.round(lay('chartVh', 22) * window.innerHeight / 100); }   // 1 unità = 1 px
  BOT = Ht - 44;
  var end = Math.min(start + N, H.time.length), n = end - start;
  if (n < 2) return '';
  var tmin = 99, tmax = -99, imin = start, imax = start;
  for (i = start; i < end; i++){
    var t = H.temperature_2m[i];
    if (t < tmin){ tmin = t; imin = i; }
    if (t > tmax){ tmax = t; imax = i; }
  }
  var span = Math.max(tmax - tmin, 4), lo = tmin - span * 0.45, hi = tmax + span * 0.25;
  var dx = (W - L - R) / (n - 1);
  function X(i){ return L + (i - start) * dx; }
  function Y(t){ return BOT - (t - lo) / (hi - lo) * (BOT - TOP - 14); }
  var s = '<svg viewBox="0 0 ' + W + ' ' + Ht + '" xmlns="http://www.w3.org/2000/svg">';
  // notte ombreggiata
  for (i = start; i < end; i++) if (!H.is_day[i])
    s += '<rect x="' + (X(i) - dx / 2) + '" y="0" width="' + (dx + 0.5) + '" height="' + (BOT + 4) + '" fill="rgba(0,0,20,.22)"/>';
  // pioggia: barre mm (piena = 4 mm/h) con trasparenza = probabilità
  for (i = start; i < end; i++){
    var mm = H.precipitation[i] || 0, pp = H.precipitation_probability[i] || 0;
    if (mm > 0.05 || pp >= 30){
      var bh = Math.max(3, Math.min(mm / 4, 1) * Math.min(46, (BOT - TOP) * 0.6));
      s += '<rect x="' + (X(i) - dx * 0.35) + '" y="' + (BOT - bh) + '" width="' + (dx * 0.7) + '" height="' + bh +
           '" rx="2" fill="#7CC4FF" opacity="' + (0.25 + pp / 140).toFixed(2) + '"/>';
    }
  }
  // linea temperatura colorata per temperatura (gradiente verticale) con riempimento sfumato
  var d = '', area = 'M' + X(start) + ' ' + BOT;
  for (i = start; i < end; i++){ d += (i === start ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(H.temperature_2m[i]).toFixed(1); area += 'L' + X(i).toFixed(1) + ' ' + Y(H.temperature_2m[i]).toFixed(1); }
  area += 'L' + X(end - 1) + ' ' + BOT + 'z';
  var stroke = tempCol((tmin + tmax) / 2), fillc = stroke;
  if (tmax - tmin > 0.3){
    var gs = '', ts = [tmax], k;
    for (k = TSTOPS.length - 1; k >= 0; k--) if (TSTOPS[k][0] < tmax && TSTOPS[k][0] > tmin) ts.push(TSTOPS[k][0]);
    ts.push(tmin);
    for (k = 0; k < ts.length; k++) gs += '<stop offset="' + ((tmax - ts[k]) / (tmax - tmin)).toFixed(3) + '" stop-color="' + tempCol(ts[k]) + '"/>';
    s += '<defs><linearGradient id="tg" gradientUnits="userSpaceOnUse" x1="0" y1="' + Y(tmax).toFixed(1) + '" x2="0" y2="' + Y(tmin).toFixed(1) + '">' + gs + '</linearGradient>' +
      '<linearGradient id="fg" gradientUnits="userSpaceOnUse" x1="0" y1="' + Y(tmax).toFixed(1) + '" x2="0" y2="' + BOT + '">' +
      '<stop offset="0" stop-color="' + tempCol(tmax) + '" stop-opacity=".38"/><stop offset="1" stop-color="' + tempCol(tmin) + '" stop-opacity=".03"/></linearGradient></defs>';
    stroke = 'url(#tg)'; fillc = 'url(#fg)';
  }
  s += '<path d="' + area + '" fill="' + fillc + '"/>';
  s += '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity=".18"/>';
  s += '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>';
  // etichette ogni 3 ore
  for (i = start; i < end; i += 3){
    var x = X(i), tt = Math.round(H.temperature_2m[i]);
    s += '<g transform="translate(' + (x - 13) + ',0) scale(.42)">' + iconSvg(H.weather_code[i], H.is_day[i]) + '</g>';
    if (i !== imin && i !== imax && Math.abs(x - X(imax)) > 80 && Math.abs(x - X(imin)) > 80)
      s += '<text x="' + x + '" y="' + (Y(H.temperature_2m[i]) - 8) + '" fill="#fff" font-size="15" text-anchor="middle">' + tt + '°</text>';
    s += '<text x="' + x + '" y="' + (BOT + 22) + '" fill="rgba(255,255,255,.7)" font-size="14" text-anchor="middle">' + (i === start ? 'Ora' : hm(H.time[i]).substr(0, 2)) + '</text>';
    var p = H.precipitation_probability[i];
    if (p >= 20) s += '<text x="' + x + '" y="' + (BOT + 40) + '" fill="#BFE3FF" font-size="13" text-anchor="middle">' + p + '%</text>';
  }
  // min e max evidenziati
  function mark(ix, col, lbl, up){
    var x = X(ix), y = Y(H.temperature_2m[ix]);
    var anchor = x < 60 ? 'start' : (x > W - 60 ? 'end' : 'middle');
    return '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + col + '" stroke="#fff" stroke-width="1.5"/>' +
      '<text x="' + x + '" y="' + (up ? y - 10 : y + 17) + '" fill="' + col + '" font-size="16" font-weight="bold" stroke="rgba(0,0,0,.45)" stroke-width="3" paint-order="stroke" text-anchor="' + anchor + '">' +
      lbl + ' ' + Math.round(H.temperature_2m[ix]) + '° · ' + hm(H.time[ix]) + '</text>';
  }
  var barNear = false;
  for (i = Math.max(start, imin - 3); i <= Math.min(end - 1, imin + 3); i++) if ((H.precipitation[i] || 0) > 0.05 || (H.precipitation_probability[i] || 0) >= 30) barNear = true;
  s += mark(imax, '#FFC93C', 'max', true) + mark(imin, '#8FD3FF', 'min', imin === imax || barNear);
  return s + '</svg>';
}

function buildWxAlerts(d, start){
  var H = d.hourly, out = [], end = Math.min(start + 24, H.time.length), i;
  var hailAt = -1, stormAt = -1, cape = 0, capeAt = -1, gust = 0, gustAt = -1, rain = 0, tmin = 99, tminAt = -1;
  for (i = start; i < end; i++){
    var c = H.weather_code[i], pp = H.precipitation_probability[i] || 0;
    if ((c === 96 || c === 99) && hailAt < 0) hailAt = i;
    if (c === 95 && stormAt < 0) stormAt = i;
    if (H.cape[i] > cape && pp >= 30){ cape = H.cape[i]; capeAt = i; }
    if (H.wind_gusts_10m[i] > gust){ gust = H.wind_gusts_10m[i]; gustAt = i; }
    rain += H.precipitation[i] || 0;
    if (H.temperature_2m[i] < tmin){ tmin = H.temperature_2m[i]; tminAt = i; }
  }
  function when(ix){ var t = loc(H.time[ix]), n = new Date();
    return (t.getDate() === n.getDate() ? '' : 'domani ') + 'ore ' + hm(H.time[ix]); }
  if (hailAt >= 0) out.push({lv: 'o', t: 'GRANDINE', x: 'temporale con grandine, ' + when(hailAt)});
  else if (cape >= 1500 && capeAt >= 0) out.push({lv: 'o', t: 'GRANDINE?', x: 'rischio grandine (CAPE ' + Math.round(cape) + '), ' + when(capeAt)});
  else if (stormAt >= 0) out.push({lv: 'y', t: 'TEMPORALE', x: when(stormAt)});
  if (gust >= 60) out.push({lv: gust >= 80 ? 'o' : 'y', t: 'VENTO', x: 'raffiche fino a ' + Math.round(gust) + ' km/h, ' + when(gustAt)});
  if (rain >= 30) out.push({lv: rain >= 60 ? 'o' : 'y', t: 'PIOGGIA', x: Math.round(rain) + ' mm nelle prossime 24 ore'});
  if (tmin <= 2) out.push({lv: 'y', t: 'GELO', x: 'minima ' + Math.round(tmin) + '° ' + when(tminAt) + ' · strade scivolose'});
  return out;
}

function render(d){
  var c = d.current, i, k, html;
  if ($('nowIc')) $('nowIc').innerHTML = icon(c.weather_code, c.is_day);
  if ($('nowT')){
    $('nowT').innerHTML = Math.round(c.temperature_2m) + '°';
    $('nowT').style.color = tempCol(c.temperature_2m);
    $('nowT').style.textShadow = '0 0 .35em ' + tempCol(c.temperature_2m, 0.55);
  }
  if ($('desc')) $('desc').innerHTML = desc(c.weather_code);
  if ($('meta')) $('meta').innerHTML =
    'Percepita <b>' + Math.round(c.apparent_temperature) + '°</b> · Umidità <b>' + c.relative_humidity_2m + '%</b><br>' +
    'Vento <b>' + Math.round(c.wind_speed_10m) + ' km/h ' + card(c.wind_direction_10m) + '</b> · raffiche <b>' + Math.round(c.wind_gusts_10m) + '</b>';
  SUN.rise = loc(d.daily.sunrise[0]); SUN.set = loc(d.daily.sunset[0]);
  SUN.rise2 = loc(d.daily.sunrise[1]); SUN.set0 = new Date(SUN.set.getTime() - 86400000);

  var H = d.hourly, key = c.time.substr(0, 13), start = 0;
  for (i = 0; i < H.time.length; i++){ if (H.time[i].substr(0, 13) >= key){ start = i; break; } }
  if ($('chart')) $('chart').innerHTML = chart(H, start);
  wxAlerts = buildWxAlerts(d, start);
  WX = {d: d, start: start}; renderTiles();

  var D = d.daily, gmin = 99, gmax = -99, N = Math.min(DAYS, D.time.length);
  for (k = 0; k < N; k++){
    if (D.temperature_2m_min[k] < gmin) gmin = D.temperature_2m_min[k];
    if (D.temperature_2m_max[k] > gmax) gmax = D.temperature_2m_max[k];
  }
  var range = (gmax - gmin) || 1, list = !!lay('daysList', false);
  html = '';
  for (k = 0; k < N; k++){
    var dt = loc(D.time[k]), mn = D.temperature_2m_min[k], mx = D.temperature_2m_max[k];
    var pp = D.precipitation_probability_max[k], ps = D.precipitation_sum[k], gu = D.wind_gusts_10m_max[k];
    var nm = k === 0 ? 'Oggi' : GG[dt.getDay()] + ' ' + dt.getDate();
    if (list){
      var info2 = pp >= 10 ? pp + '%' : '';
      html += '<div class="dr"><span class="dn">' + nm + '</span>' + icon(D.weather_code[k], 1) + '<span class="dmin">' + Math.round(mn) + '°</span>' +
        '<span class="dbar"><i style="left:' + ((mn - gmin) / range * 100).toFixed(1) + '%;width:' + Math.max(6, (mx - mn) / range * 100).toFixed(1) +
        '%;background:linear-gradient(90deg,' + tempCol(mn) + ',' + tempCol(mx) + ')"></i></span><span class="dmax">' + Math.round(mx) + '°</span>' +
        '<span class="dpp">' + info2 + '</span></div>';
      continue;
    }
    var info = pp >= 10 ? pp + '%' + (ps >= 0.5 ? ' ' + (ps < 10 ? ps.toFixed(1) : Math.round(ps)) + 'mm' : '') : '';
    if (gu >= 50) info += (info ? ' · ' : '') + '≈' + Math.round(gu);
    html += '<div class="dc"><div class="n">' + nm + '</div>' + icon(D.weather_code[k], 1) +
      '<div class="t"><b>' + Math.round(mx) + '°</b> <span>' + Math.round(mn) + '°</span></div><div class="p">' + info + '</div></div>';
  }
  if ($('days')) $('days').innerHTML = html;
  var n = new Date();
  if ($('foot')){ $('foot').className = 'foot';
  $('foot').innerHTML = CITY + ' · aggiornato alle ' + hm2(n) + ' · Open-Meteo'; }
  lastMin = -1; tick();
}

function fail(){ if (!$('foot')) return; $('foot').className = 'foot err'; $('foot').innerHTML = 'Aggiornamento meteo non riuscito, riprovo tra poco'; }
function load(i){
  if (i >= HOSTS.length){ fail(); return; }
  var x = new XMLHttpRequest();
  x.open('GET', HOSTS[i] + Q, true);
  x.timeout = 20000;
  x.onload = function(){
    if (x.status === 200){ try { render(JSON.parse(x.responseText)); hostIdx = i; } catch (e) { fail(); } }
    else load(i + 1);
  };
  x.onerror = x.ontimeout = function(){ load(i + 1); };
  x.send();
}

// ===== QUALITÀ DELL'ARIA (chiamata separata, fallimento silenzioso) =====
function loadAir(i){
  if (i >= AQ_HOSTS.length){ AQ = null; renderTiles(); return; }
  var x = new XMLHttpRequest();
  x.open('GET', AQ_HOSTS[i] + QA, true);
  x.timeout = 20000;
  x.onload = function(){
    if (x.status === 200){ try { var j = JSON.parse(x.responseText); AQ = j.current && j.current.european_aqi !== null && j.current.european_aqi !== undefined ? j.current : null; renderTiles(); } catch (e) { loadAir(i + 1); } }
    else loadAir(i + 1);
  };
  x.onerror = x.ontimeout = function(){ loadAir(i + 1); };
  x.send();
}

// ===== TESSERE DA METEOROLOGO =====
function mmTxt(v){ return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
function tile(lbl, acc, val, unit, note, extra){
  return '<div class="card tile" style="border-top-color:' + acc + '"><div class="tl">' + lbl + '</div>' +
    '<div class="tv"><b' + (val.length > 8 ? ' class="sm"' : '') + ' style="color:' + acc + '">' + val + '</b>' + (unit ? '<u>' + unit + '</u>' : '') + '</div>' + (extra || '') +
    '<div class="tn">' + note + '</div></div>';
}
var C_OK = '#5FD38D', C_WARN = '#FFD166', C_BAD = '#FF7A6B', C_BLUE = '#7CC4FF', C_ORG = '#FF9A52';

function tileRain(){
  var M = WX.d.minutely_15, n = new Date(), i, t = [], v = [];
  if (!M || !M.time || !M.precipitation) return tile('PIOGGIA 3H', 'rgba(255,255,255,.3)', '—', '', 'dato non disponibile');
  var base = new Date(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), Math.floor(n.getMinutes() / 15) * 15).getTime();
  for (i = 0; i < M.time.length && t.length < 12; i++){
    var dt = loc(M.time[i]);
    if (dt.getTime() >= base){ t.push(dt); v.push(M.precipitation[i] || 0); }
  }
  if (t.length < 2) return tile('PIOGGIA 3H', 'rgba(255,255,255,.3)', '—', '', 'dato non disponibile');
  var TH = 0.1, tot = 0, first = -1, acc, note, k;
  for (i = 0; i < v.length; i++){ tot += v[i]; if (first < 0 && v[i] >= TH) first = i; }
  if (v[0] >= TH){
    var stop = -1;
    for (k = 1; k < v.length; k++) if (v[k] < TH){ stop = k; break; }
    note = stop >= 0 ? 'Piove · smette ~' + hm2(t[stop]) : (t.length >= 12 ? 'Piove per 3h+' : 'Piove ancora');
    acc = C_BLUE;
  } else if (first >= 0){
    var mi = Math.max(5, Math.round((t[first].getTime() - n.getTime()) / 300000) * 5);
    note = 'Pioggia tra ' + mi + ' min'; acc = C_WARN;
  } else {
    note = 'Asciutto fino alle ' + hm2(new Date(t[t.length - 1].getTime() + 900000)); acc = C_OK;
  }
  var bars = '<div class="tb">';
  for (i = 0; i < 12; i++){
    var h = i < v.length ? Math.min(1, v[i] / 2) : 0;
    bars += '<i style="height:' + (v[i] >= 0.05 ? Math.max(12, Math.round(h * 100)) : 5) + '%;background:' + (i < v.length && v[i] >= 0.05 ? C_BLUE : 'rgba(255,255,255,.25)') + '"></i>';
  }
  bars += '</div>';
  return tile('PIOGGIA 3H', acc, mmTxt(tot), 'mm', note, bars);
}

function tileMoto(){
  var H = WX.d.hourly, n = new Date(), off = n.getHours() >= 19 ? 1 : 0, day = WX.d.daily.time[off], i;
  var tmin = 99, tmax = -99, tminH = 0, pp = 0, gust = 0, rain = 0, bad = 0, cnt = 0, lbl = off ? 'MOTO DOMANI' : 'MOTO OGGI';
  for (i = 0; i < H.time.length; i++){
    if (H.time[i].substr(0, 10) !== day) continue;
    var hr = +H.time[i].substr(11, 2);
    if (hr < 8 || hr > 19) continue;
    cnt++;
    if (H.temperature_2m[i] < tmin){ tmin = H.temperature_2m[i]; tminH = hr; }
    if (H.temperature_2m[i] > tmax) tmax = H.temperature_2m[i];
    if ((H.precipitation_probability[i] || 0) > pp) pp = H.precipitation_probability[i];
    if (H.wind_gusts_10m[i] > gust) gust = H.wind_gusts_10m[i];
    rain += H.precipitation[i] || 0;
    var c = H.weather_code[i];
    if (c === 66 || c === 67 || (c >= 71 && c <= 77) || c === 85 || c === 86 || c === 96 || c === 99){ if (!bad) bad = c; }
  }
  if (!cnt) return tile(lbl, 'rgba(255,255,255,.3)', '—', '', 'dato non disponibile');
  var cold = 'freddo ' + (tminH < 12 ? 'al mattino ' : '') + Math.round(tmin) + '°';
  var v, acc, note;
  if (bad || pp >= 60 || rain >= 2 || gust >= 55 || tmin < 4){
    v = 'NO'; acc = C_BAD;
    note = bad ? (bad === 96 || bad === 99 ? 'grandine' : bad === 66 || bad === 67 ? 'ghiaccio' : 'neve') :
      pp >= 60 ? 'pioggia ' + Math.round(pp) + '%' : rain >= 2 ? 'pioggia ' + mmTxt(rain) + ' mm' : gust >= 55 ? 'raffiche ' + Math.round(gust) : cold;
  } else if (pp >= 30 || gust >= 40 || tmin < 10){
    v = 'DISCRETA'; acc = C_WARN;
    note = pp >= 30 ? 'pioggia ' + Math.round(pp) + '%' : gust >= 40 ? 'raffiche ' + Math.round(gust) : cold;
  } else {
    v = 'OTTIMA'; acc = C_OK; note = 'min ' + Math.round(tmin) + '° · max ' + Math.round(tmax) + '°';
  }
  return tile(lbl, acc, v, '', note);
}

function tilePress(){
  var P = WX.d.hourly.pressure_msl, s = WX.start;
  if (!P || P[s] === null || P[s] === undefined) return tile('PRESSIONE', 'rgba(255,255,255,.3)', '—', '', 'dato non disponibile');
  var dl = s >= 3 ? P[s] - P[s - 3] : (P[s + 3] !== undefined ? P[s + 3] - P[s] : 0), arrow, note, acc;
  arrow = dl <= -1 ? '↓' : dl >= 1 ? '↑' : '→';
  if (dl <= -3){ note = 'in calo rapido: peggiora'; acc = C_BAD; }
  else if (dl <= -1){ note = 'in calo'; acc = C_WARN; }
  else if (dl >= 3){ note = 'in rialzo: migliora'; acc = C_OK; }
  else { note = 'stabile'; acc = C_BLUE; }
  var ds = (dl > 0 ? '+' : dl < 0 ? '−' : '') + Math.abs(Math.round(dl));
  return tile('PRESSIONE', acc, arrow + Math.round(P[s]), ds + ' hPa', note);
}

var POLLEN = [['alder_pollen', 'Ontano'], ['birch_pollen', 'Betulla'], ['grass_pollen', 'Graminacee'], ['olive_pollen', 'Olivo'], ['ragweed_pollen', 'Ambrosia']];
function tileAir(){
  var i;
  if (AQ){
    var a = Math.round(AQ.european_aqi), lab, acc;
    if (a <= 20){ lab = 'Buona'; acc = C_OK; }
    else if (a <= 40){ lab = 'Discreta'; acc = '#A6E36B'; }
    else if (a <= 60){ lab = 'Moderata'; acc = C_WARN; }
    else if (a <= 80){ lab = 'Scadente'; acc = C_ORG; }
    else if (a <= 100){ lab = 'Pessima'; acc = C_BAD; }
    else { lab = 'Molto pessima'; acc = '#C58BFF'; }
    var best = 0, bn = '';
    for (i = 0; i < POLLEN.length; i++){ var pv = AQ[POLLEN[i][0]]; if (pv !== null && pv !== undefined && pv > best){ best = pv; bn = POLLEN[i][1]; } }
    var note = best >= 10 ? bn + (best >= 50 ? ' molto alto' : ' alto') : 'PM2.5 ' + Math.round(AQ.pm2_5);
    return tile('ARIA · AQI ' + a, acc, lab, '', note);
  }
  var uv = WX.d.daily.uv_index_max ? WX.d.daily.uv_index_max[0] : null;
  if (uv === null || uv === undefined) return tile('UV', 'rgba(255,255,255,.3)', '—', '', 'dato non disponibile');
  var ul = uv <= 2 ? 'Basso' : uv <= 5 ? 'Moderato' : uv <= 7 ? 'Alto' : 'Molto alto';
  return tile('UV', uv <= 2 ? C_OK : uv <= 5 ? C_WARN : uv <= 7 ? C_ORG : C_BAD, String(Math.round(uv)), ul, 'picco di oggi');
}

function renderTiles(){
  if (!$('tiles') || !WX) return;
  var h = '';
  try { h = tileRain() + tileMoto() + tilePress() + tileAir(); } catch (e) { h = ''; }
  $('tiles').innerHTML = h;
}


// ===== RADAR (RainViewer, gratuito: zoom max 7, schema "Universal Blue"): un solo fotogramma, fermo, ogni 15 min =====
var RZ = 8, rKey = '', rFKey = '', rHost = '', rPast = null, rLast = null;
function wpx(lat, lon, z){
  var n = 256 * Math.pow(2, z), s = Math.sin(lat * Math.PI / 180);
  return {x: (lon + 180) / 360 * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n};
}
function tilesHtml(url, tsz, z, tl, w, h){
  // tsz = dimensione tile nello spazio pixel di zoom RZ
  var out = '', x0 = Math.floor(tl.x / tsz), y0 = Math.floor(tl.y / tsz), x1 = Math.floor((tl.x + w) / tsz), y1 = Math.floor((tl.y + h) / tsz);
  var max = Math.pow(2, z);
  for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++){
    if (ty < 0 || ty >= max) continue;
    var u = url.replace('{z}', z).replace('{x}', ((tx % max) + max) % max).replace('{y}', ty).replace('{s}', 'abcd'.charAt((tx + ty) & 3));
    out += '<img src="' + u + '" style="left:' + Math.round(tx * tsz - tl.x) + 'px;top:' + Math.round(ty * tsz - tl.y) + 'px;width:' + tsz + 'px;height:' + tsz + 'px">';
  }
  return out;
}
function radarGeom(){
  var el = $('radar'), w = el.offsetWidth, h = el.offsetHeight, c = wpx(LAT, LON, RZ);
  return {w: w, h: h, tl: {x: c.x - w / 2, y: c.y - h / 2}};
}
function drawRadarBase(){
  if (!$('radar')) return null;
  var g = radarGeom(), key = g.w + 'x' + g.h;
  if (key === rKey || g.w < 10) return g;
  rKey = key;
  $('rBase').innerHTML = tilesHtml('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', 256, RZ, g.tl, g.w, g.h);
  $('rLabels').innerHTML = tilesHtml('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', 256, RZ, g.tl, g.w, g.h);
  $('rPin').style.left = Math.round(g.w / 2) + 'px'; $('rPin').style.top = Math.round(g.h / 2) + 'px';
  return g;
}
function radarLabel(){
  if (!rLast || !$('rTime')) return;
  var t = new Date(rLast.time * 1000), age = Math.max(0, Math.round((new Date().getTime() - t.getTime()) / 60000));
  $('rTime').innerHTML = 'Radar ' + hm2(t) + ' · ' + (age < 1 ? 'adesso' : age < 90 ? age + ' min fa' : Math.round(age / 60) + ' h fa');
}
function buildFrames(){
  if (!rPast || !$('radar')) return;
  var g = drawRadarBase();
  if (g.w < 10) return;
  rLast = rPast.length ? rPast[rPast.length - 1] : null;
  if (!rLast){ $('rTime').innerHTML = 'Radar non disponibile'; return; }
  // tile radar z7 da 512 px = esattamente 2x2 tile z8 da 256 px
  $('rFrames').innerHTML = '<div class="lay fr">' + tilesHtml(rHost + rLast.path + '/512/{z}/{x}/{y}/2/1_1.png', 512, 7, g.tl, g.w, g.h) + '</div>';
  rFKey = g.w + 'x' + g.h;
  radarLabel();
}
function loadRadar(){
  if (!$('radar')) return;
  var x = new XMLHttpRequest();
  x.open('GET', 'https://api.rainviewer.com/public/weather-maps.json?_=' + new Date().getTime(), true);
  x.timeout = 20000;
  x.onload = function(){
    try {
      var j = JSON.parse(x.responseText);
      rHost = j.host; rPast = j.radar.past;
      buildFrames();
    } catch (e) { if (!rLast) $('rTime').innerHTML = 'Radar non disponibile'; }
  };
  x.onerror = x.ontimeout = function(){ if (!rLast) $('rTime').innerHTML = 'Radar non disponibile'; };
  x.send();
}
// ogni minuto: aggiorna "min fa" e, se cambia la dimensione del contenitore, ridisegna mappa e fotogramma
function radarCheck(){
  if (!rPast || !$('radar')) return;
  var el = $('radar');
  if (el.offsetWidth + 'x' + el.offsetHeight !== rFKey) buildFrames(); else radarLabel();
}

// ===== FOGLIO: sport + allerte ufficiali =====
var sheetRows = [], f1Live = null;
function cellStr(c){
  if (!c || c.v === null || c.v === undefined) return '';
  if (typeof c.v === 'string' && c.v.indexOf('Date(') === 0){
    if (c.f) return String(c.f);
    var a = c.v.substring(5, c.v.length - 1).split(',');
    if (+a[0] < 1900) return pad(+a[3]) + ':' + pad(+a[4]);
    return a[0] + '-' + pad(+a[1] + 1) + '-' + pad(+a[2]);
  }
  if (c.v instanceof Array) return pad(c.v[0]) + ':' + pad(c.v[1]);
  if (typeof c.v === 'number' && c.v < 1){ var m = Math.round(c.v * 1440); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  return String(c.v);
}
window.sportCb = function(resp){
  try {
    var rows = resp.table.rows, out = [];
    for (var i = 0; i < rows.length; i++){
      var c = rows[i].c, g = cellStr(c[0]);
      if (!g || g === 'gruppo') continue;
      out.push({g: g, t: cellStr(c[1]), d: cellStr(c[2]), h: cellStr(c[3]), x: cellStr(c[4]), ch: cellStr(c[5])});
    }
    sheetRows = out; renderSport(); renderAlerts(); renderAgenda();
  } catch (e) {}
};
function loadSheet(){
  var old = $('sheetJs'); if (old) old.parentNode.removeChild(old);
  var sc = document.createElement('script');
  sc.id = 'sheetJs';
  sc.src = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?sheet=Sport&headers=1&tqx=out:json;responseHandler:sportCb&_=' + new Date().getTime();
  document.body.appendChild(sc);
}
function loadF1(){
  var x = new XMLHttpRequest();
  x.open('GET', 'https://api.jolpi.ca/ergast/f1/current/next.json', true);
  x.timeout = 20000;
  x.onload = function(){
    try {
      var r = JSON.parse(x.responseText).MRData.RaceTable.Races[0], list = [];
      function add(lbl, o){ if (o && o.date) list.push({lbl: lbl, dt: new Date(o.date + 'T' + (o.time || '00:00:00Z'))}); }
      add('Q.Sprint', r.SprintQualifying || r.SprintShootout);
      add('Sprint', r.Sprint);
      add('Qualifiche', r.Qualifying);
      add('Gara', {date: r.date, time: r.time});
      f1Live = {name: r.raceName.replace(' Grand Prix', ''), s: list};
      renderSport(); renderAgenda();
    } catch (e) { f1Live = null; }
  };
  x.send();
}
function rowDate(r){
  if (!r.d || !/^\d{4}-\d{2}-\d{2}/.test(r.d)) return null;
  var a = r.d.substr(0, 10).split('-'), t = /^\d{1,2}:\d{2}/.test(r.h) ? r.h.split(':') : ['0', '0'];
  return new Date(+a[0], +a[1] - 1, +a[2], +t[0], +t[1]);
}
function when(dt){
  var n = new Date(), today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  var dd = Math.round((new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()) - today) / 86400000);
  var g = dd === 0 ? 'Oggi' : dd === 1 ? 'Domani' : dd < 7 ? GG[dt.getDay()] : GG[dt.getDay()] + ' ' + dt.getDate() + '/' + (dt.getMonth() + 1);
  return g + ' ' + hm2(dt);
}
function line(cls, tag, what, q, ch){
  return '<div class="s"><div class="s1"><span class="k ' + cls + '">' + tag + '</span><span class="w">' + what + '</span></div>' +
    '<div class="s2"><span class="q">' + q + '</span>' + (ch ? '<span class="c"> · ' + ch + '</span>' : '') + '</div></div>';
}
// i 2 eventi sportivi più vicini (restano visibili fino a 2 ore dopo l'inizio)
function renderSport(){
  if (!$('sport')) return;
  var now = new Date().getTime() - 2 * 3600000, ev = [], i, best = {};
  var TAG = {F1: ['f1', 'F1'], MILAN: ['mi', 'MIL'], ITALIA: ['it', 'ITA'], U21: ['u21', 'U21']};
  var gpName = '', f1ch = '';
  for (i = 0; i < sheetRows.length; i++) if (sheetRows[i].g === 'F1'){ gpName = gpName || sheetRows[i].t.split(' · ')[0]; f1ch = f1ch || sheetRows[i].ch; }
  if (f1Live){
    for (i = 0; i < f1Live.s.length; i++) if (f1Live.s[i].dt.getTime() >= now){
      ev.push({g: 'F1', dt: f1Live.s[i].dt, t: (gpName || 'GP ' + f1Live.name) + ' · ' + f1Live.s[i].lbl, ch: f1ch}); break;
    }
  }
  for (i = 0; i < sheetRows.length; i++){
    var r = sheetRows[i], dt = rowDate(r);
    if (!TAG[r.g] || !dt || dt.getTime() < now) continue;
    if (r.g === 'F1' && f1Live) continue;
    if (!best[r.g] || dt < best[r.g].dt) best[r.g] = {g: r.g, dt: dt, t: r.t, ch: r.ch};
  }
  for (var g in best) if (best.hasOwnProperty(g)) ev.push(best[g]);
  ev.sort(function(a, b){ return a.dt - b.dt; });
  var html = '';
  for (i = 0; i < ev.length && i < lay('sportMax', 2); i++){
    var tg = TAG[ev[i].g];
    html += line(tg[0], tg[1], ev[i].t, when(ev[i].dt), ev[i].ch);
  }
  $('sport').innerHTML = html;
}
function renderAlerts(){
  if (!$('alerts')) return;
  var out = [], i, today = new Date(); today.setHours(0, 0, 0, 0);
  var LV = {gialla: 'y', arancione: 'o', rossa: 'r'};
  for (i = 0; i < sheetRows.length; i++){
    var r = sheetRows[i];
    if (r.g !== 'ALLERTA') continue;
    var lv = LV[(r.ch || '').toLowerCase()];
    var dt = rowDate(r);
    if (!lv || (dt && dt < today)) continue;
    out.push({lv: lv, t: 'ALLERTA ' + r.ch.toUpperCase(), x: r.t + (r.x ? ' · ' + r.x : '') + (dt ? ' · ' + when(dt).replace(/ \d\d:\d\d$/, '') : '')});
  }
  out = out.concat(wxAlerts);
  var html = '';
  for (i = 0; i < out.length && i < lay('alertMax', 2); i++) html += '<div class="al ' + out[i].lv + '"><i>' + out[i].t + '</i><span>' + out[i].x + '</span></div>';
  $('alerts').innerHTML = html;
}

// ===== AGENDA (scheda "Agenda": titolo | data | ora | fine | calendario | aggiornato) =====
var agendaRows = [];
window.agendaCb = function(resp){
  try {
    var rows = resp.table.rows, out = [];
    for (var i = 0; i < rows.length; i++){
      var c = rows[i].c, t = cellStr(c[0]);
      if (!t || t === 'titolo') continue;
      out.push({t: t, d: cellStr(c[1]), h: cellStr(c[2]), e: cellStr(c[3]), cal: cellStr(c[4])});
    }
    agendaRows = out; renderAgenda();
  } catch (e) {}
};
function loadAgenda(){
  if (!$('agenda')) return;
  var old = $('agendaJs'); if (old) old.parentNode.removeChild(old);
  var sc = document.createElement('script');
  sc.id = 'agendaJs';
  sc.src = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?sheet=Agenda&headers=1&tqx=out:json;responseHandler:agendaCb&_=' + new Date().getTime();
  document.body.appendChild(sc);
}
function dayStart(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function renderAgenda(){
  if (!$('agenda')) return;
  var now = new Date(), ev = [], i, today = dayStart(now).getTime();
  var COL = {'personale': '#7CC4FF', 'famiglia': '#7BD88F', 'festività': '#FF8A7A', 'festivita': '#FF8A7A'};
  for (i = 0; i < agendaRows.length; i++){
    var r = agendaRows[i], dt = rowDate(r);
    if (!dt || dayStart(dt).getTime() !== today) continue;   // solo eventi di oggi
    var allDay = !/^\d{1,2}:\d{2}/.test(r.h), endT;
    if (allDay) endT = today + 86400000;
    else if (/^\d{1,2}:\d{2}/.test(r.e)){
      var ea = r.e.split(':'), ed = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), +ea[0], +ea[1]);
      endT = ed.getTime() > dt.getTime() ? ed.getTime() : dt.getTime();
    } else endT = dt.getTime() + 3600000;   // senza fine: finito 1 ora dopo l'inizio
    if (endT <= now.getTime()) continue;
    ev.push({dt: dt, allDay: allDay, t: r.t, col: COL[(r.cal || '').toLowerCase()] || '#BFC8D4'});
  }
  ev.sort(function(a, b){ return a.dt - b.dt; });
  var html = '', max = AGENDA_MAX;
  for (i = 0; i < ev.length && i < max; i++){
    html += '<div class="ag"><i style="background:' + ev[i].col + '"></i>' + (ev[i].allDay ? '' : '<span class="aw">' + hm2(ev[i].dt) + '</span>') +
      '<span class="at">' + ev[i].t + '</span></div>';
  }
  if (!html) html = '<div class="ag none">Giornata libera</div>';
  $('agenda').innerHTML = html;
  // se il box non basta, toglie righe agenda dal fondo (ne resta sempre almeno una)
  var box = $('box'), rows = $('agenda').childNodes;
  while (box && rows.length > 1 && box.scrollHeight > box.clientHeight + 1) $('agenda').removeChild(rows[rows.length - 1]);
}

if (SAFE_ZONES) document.body.className += ' safe';
tick();
setInterval(tick, 1000);
load(hostIdx);
setInterval(function(){ load(hostIdx); }, REFRESH_MIN * 60000);
loadSheet(); loadF1(); loadAgenda();
setInterval(function(){ loadSheet(); loadF1(); loadAgenda(); }, SPORT_REFRESH_MIN * 60000);
setInterval(function(){ renderSport(); renderAgenda(); }, 60000);
loadAir(0);
setInterval(function(){ loadAir(0); }, AQ_REFRESH_MIN * 60000);
setTimeout(loadRadar, 300);
setInterval(loadRadar, RADAR_REFRESH_MIN * 60000);
// ricarica completa ogni 6 ore (libera memoria e prende la nuova versione da GitHub)
setTimeout(function(){ location.reload(); }, 6 * 3600000);
