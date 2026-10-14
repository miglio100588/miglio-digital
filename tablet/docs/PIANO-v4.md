# PIANO v4 — effetto WOW, radar più grande e statico, box unico Oggi+Sport, dati da meteorologo

Pianificato da Opus, da eseguire con un subagente Sonnet. Leggi prima `../CLAUDE.md`. Vincoli invariati: ES5, niente librerie, `app.js` condiviso, bump `app.js?v=5`.

## Richieste di Alberto
1. Radar aggiornato **ogni 15 minuti**, **senza animazione**: solo l'ultimo fotogramma, fermo.
2. **Un solo box** con al massimo 3 eventi di **oggi** (agenda) e i **prossimi 2 eventi sportivi**.
3. Info "sfiziose da meteorologo" e/o radar più grande. Effetto **WOW**.

## 1. Radar (app.js)
- `RADAR_REFRESH_MIN = 15`, `RADAR_FRAMES = 1`: nessun `setInterval` di animazione, nessuna barra di avanzamento.
- Mostra solo `radar.past[ultimo]`. Etichetta: `Radar 09:10 · 12 min fa`, con "min fa" aggiornato ogni minuto.
- Opacità radar 0.8, pin con alone. Aggiungi in basso a destra una mini legenda: quattro quadratini (debole → forte) con i colori Universal Blue (azzurro, blu, giallo, rosso) e la scritta "pioggia".
- Il radar diventa **più grande** (vedi layout).

## 2. Nuovi dati
Estendi la query Open-Meteo con:
- `&minutely_15=precipitation&forecast_minutely_15=12` (nowcast delle prossime 3 ore);
- in `hourly`: `pressure_msl`;
- in `daily`: `uv_index_max`.
Nuova chiamata, con fallback silenzioso se fallisce: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=..&longitude=..&current=european_aqi,pm2_5,alder_pollen,birch_pollen,grass_pollen,olive_pollen,ragweed_pollen&timezone=Europe%2FRome`, refresh 60 min.

## 3. Tessere "meteorologo" (riga di 4 tessere compatte)
Ogni tessera: piccola etichetta maiuscola, valore grande, una riga di nota. Colore d'accento in base allo stato.
1. **PIOGGIA 3H** (nowcast `minutely_15`): 12 barrette verticali (altezza proporzionale ai mm, piena = 2 mm/15'). Testo:
   - nessuna pioggia → "Asciutto fino alle HH:MM" (fine finestra);
   - piove ora → "Piove · smette ~HH:MM" oppure "Piove per 3h+";
   - pioggia in arrivo → "Pioggia tra NN min".
2. **MOTO** (oggi tra 08 e 19, oppure domani se ora ≥ 19; titolo "MOTO OGGI"/"MOTO DOMANI"). Su quelle ore: tmin, probabilità pioggia massima, raffica massima, pioggia totale, codici:
   - **NO** (rosso): pp ≥ 60, oppure pioggia ≥ 2 mm, oppure raffica ≥ 55, oppure tmin < 4, oppure codici 66/67/71–77/85/86/96/99;
   - **DISCRETA** (giallo): pp ≥ 30, oppure raffica ≥ 40, oppure tmin < 10;
   - **OTTIMA** (verde) altrimenti.
   Nota = fattore decisivo, ad esempio "freddo al mattino 6°", "pioggia 70%", "raffiche 48", "min 12° · max 22°".
3. **PRESSIONE**: `pressure_msl` di adesso arrotondata, freccia ↑/↓/→ con variazione su 3 ore (passate se disponibili, altrimenti prossime). Nota: ≤ −3 "in calo rapido: peggiora"; ≤ −1 "in calo"; ≥ +3 "in rialzo: migliora"; altrimenti "stabile".
4. **ARIA** (se la chiamata air-quality risponde): AQI europeo con etichetta (0–20 Buona, 20–40 Discreta, 40–60 Moderata, 60–80 Scadente, 80–100 Pessima, >100 Molto pessima) e nota con il polline più alto se ≥ 10 grani/m³ ("Graminacee alto"), altrimenti "PM2.5 NN". Se non risponde: **UV** con `uv_index_max` di oggi e nota (≤2 Basso, ≤5 Moderato, ≤7 Alto, >7 Molto alto).

## 4. Box unico "OGGI"
Una sola card, due colonne interne:
- sinistra **OGGI**: eventi di oggi non ancora finiti (tutto il giorno compresi), massimo 3. Se non ce ne sono: "Giornata libera" in grigio;
- destra **SPORT**: i 2 eventi più vicini (come oggi).
- Gli avvisi (grandine, vento, allerte ufficiali, massimo 2) compaiono come fascia compatta in testa a questo box, e il box si adatta riducendo prima le righe agenda.

## 5. Effetto WOW (sobrio, leggero per i vecchi tablet)
- **Linea temperatura del grafico colorata per temperatura** (gradiente SVG verticale: ≤0 viola #9B8CFF, 5 azzurro #7CC4FF, 15 verde acqua #7BE0C3, 22 giallo #FFD166, 30+ arancio #FF8A4C), con riempimento sfumato sotto.
- **Temperatura attuale** colorata con lo stesso schema, con un leggero `text-shadow` luminoso.
- **Card** con bordo superiore luminoso da 1px (`rgba(255,255,255,.18)`) e sfondo con gradiente sottile.
- **Notte**: un cielo stellato statico (una decina di `radial-gradient` piccoli su `body.p-night`/`p-dusk`, nessuna animazione).
- **Fase lunare** calcolata in locale (ciclo sinodico 29.53059 giorni, riferimento luna nuova 2000-01-06 18:14 UTC): icona SVG della luna con la parte illuminata corretta e la percentuale. Va accanto all'arco solare nella riga alba/tramonto.
- I due punti dell'orologio lampeggiano lentamente (opacity 1 ↔ .35 ogni secondo, solo una classe CSS che cambia).

## 6. Layout Galaxy (index.html, 1024×600)
- **Sinistra (36%)**:
  - orologio 13vh e data 3.2vh;
  - riga "attuale": icona 9vh, temperatura 9.5vh colorata, a destra condizione (3vh), "Percepita X° · Umidità Y%" e "Vento ... · raffiche ..." (2.5vh);
  - riga sole e luna: arco mini (svg 7vh) con alba, tramonto e "tra Xh Ym", luna a destra;
  - **radar** card `flex:1`, almeno 46vh. Sopra c'è la scritta "Please Get a License": va bene.
- **Destra (64%)**:
  - grafico 24h (svg 25vh, sotto la scritta "PLUS": va bene, perché la fila di icone è in alto);
  - striscia 6 giorni;
  - riga 4 tessere meteorologo (circa 12vh);
  - box unico OGGI+SPORT (`flex:1`), con gli avvisi in testa quando presenti;
  - piede 2vh.

## 7. Layout iPad (ipad.html, 1024×768)
- **Fascia alta (30vh)**: [orologio, data, riga sole e luna (30%)] [attuale grande con meta (28%)] [box OGGI+SPORT con avvisi (42%)].
- **Fascia centrale (21vh)**: grafico 24h a tutta larghezza.
- **Fascia bassa (resto)**: [**radar** 58%, alto quanto tutta la fascia] [colonna destra: 6 giorni come lista verticale compatta, cioè nome, icona, min, barra, max, pioggia; sotto le 4 tessere in griglia 2×2].

## 8. mock-render.js
- Aggiungi ai mock: `minutely_15` (pioggia in arrivo tra 45 min), `pressure_msl` in calo di 4 hPa, `uv_index_max`, risposta air-quality (AQI 34, graminacee 25), agenda con eventi di oggi e di domani (domani non deve comparire).
- Scenario extra `--dry`: niente pioggia e niente avvisi, per vedere il layout pulito.
- Render: galaxy-day e galaxy-night (`--overlay`), ipad-day e ipad-night, più galaxy-dry e ipad-dry.

## 9. Criteri di accettazione
- ES5 nei file runtime (grep come nel v3), `node --check app.js`.
- I 6 screenshot senza overflow (controllo automatico) e controllati a occhio: radar grande e statico, tessere leggibili, box unico con max 3 eventi di oggi + 2 sport, avvisi visibili e mai coperti dalla scritta "PLUS" sul Galaxy, linea temperatura colorata, luna visibile.
- Aggiorna `README.md`.
- **Nessun commit e nessun push.**
