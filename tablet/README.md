# Tablet meteo + sport + agenda

Pannello a muro per Galaxy Tab 2 (Android 6, Fully Kiosk) e iPad 2 (iOS 9, Safari). Regole di progetto in `CLAUDE.md`, piani in `docs/`.

## URL
| Dispositivo | URL | Viewport |
|---|---|---|
| Galaxy Tab 2 | https://miglio100588.github.io/miglio-digital/tablet/ | 1024x600 |
| iPad 2 | https://miglio100588.github.io/miglio-digital/tablet/ipad.html | 1024x768 |

## File
- `index.html`: layout Galaxy. `ipad.html`: layout iPad. Ognuno definisce `var LAYOUT = {...}` e include `app.js?v=6`.
- `app.js`: tutta la logica (meteo, tessere meteorologo, aria, daylight, luna, radar, sport, agenda). CONFIG in testa. Ogni render controlla che l'elemento esista.
- `tools/mock-render.js`: screenshot con dati finti. `docs/`: piani e foto di riferimento.

## Layout (v5: leggibilita' a distanza, WCAG 2.2)
- Galaxy (1024x600): colonna sinistra 38%: card ORA (orologio 15vh, data, "Tramonto 18:29 · tra 8h 44m"), card ADESSO (icona, temperatura 12vh, condizione, percepita, vento; "dati delle HH:MM" in arancio solo se piu' vecchi di 30 min), radar grande. Colonna destra: grafico 24 ore (icone e orari ogni 3 h, temperature ogni 6 h, min/max in grande), 5 giorni, 3 tessere (MOTO, PIOGGIA 3H, ARIA/PRESSIONE alternate ogni 10 s), box OGGI + SPORT alto quanto serve con gli avvisi in testa.
- iPad (1024x768): stessa struttura a due colonne (37% / resto) con ADESSO completo (percepita, umidita', raffiche), 5 giorni in lista con barre, e in basso a tutta larghezza 4 tessere (MOTO, PIOGGIA 3H, PRESSIONE, ARIA).
- Tutto il testo sta in card scure; dimensioni minime 3,7vh (Galaxy) e 3,3vh (iPad); vedi `CLAUDE.md` (Regole di leggibilita').
- Tessere: PIOGGIA 3H (nowcast 15 min), MOTO OGGI/DOMANI (OTTIMA/DISCRETA/NO), PRESSIONE (trend 3 h), ARIA (AQI europeo + polline; se la chiamata fallisce diventa UV).
- Radar: un solo fotogramma fermo, aggiornato ogni 15 min, con etichetta "Radar HH:MM · N min fa" e legenda "debole … forte".
- OGGI: max 3 eventi di oggi non ancora finiti; SPORT: i 2 eventi piu' vicini su due righe (squadra, poi giorno e ora). Se il box non basta si riduce a gradini: titoli, righe agenda, seconda riga sport.
- LAYOUT: `name`, `agendaMax`, `chartHours`, `chartVh`, `days`, `safe`, `chartFs`/`chartBig`/`chartIc` (vh dei testi e icone del grafico) + opzionali `daysList`, `tilesAlt`, `fullMeta`, `sunTra`, `sportCh`, `tightDash`, `alertMax`, `sportMax`.

## Fonti
| Blocco | Fonte | Refresh |
|---|---|---|
| Meteo, grafico, giorni, nowcast 3 h (`minutely_15`), pressione, UV, avvisi calcolati | Open-Meteo | 15 min |
| Aria e pollini | Open-Meteo `air-quality-api.open-meteo.com` (fallimento silenzioso: la tessera ARIA diventa UV) | 60 min |
| Radar (solo ultimo fotogramma) | RainViewer + mappa Esri Dark Gray | 15 min |
| F1 | Jolpica | 30 min |
| Sport, allerte ufficiali | Foglio Google, scheda `Sport` (JSONP `sportCb`) | 30 min |
| Agenda | Stesso foglio, scheda `Agenda` (JSONP `agendaCb`) | 30 min, ridisegno ogni minuto |

Agenda: colonne `titolo | data | ora | fine | calendario | aggiornato`; mostra solo gli eventi di oggi non ancora finiti, max `agendaMax` (3).

## Scheduled task
| Nome | ID | Quando |
|---|---|---|
| Tablet meteo – aggiorna sport | trig_01DhaB9UdibLedkTysnYrFGD | 6:52 e 15:52 |
| Tablet meteo – agenda | trig_01KzDmZAdYmyviYz3ddctDVJ | ogni 2 ore, 6:52–20:52 |

## Provare in locale
```
cd tablet
NODE_PATH=$(npm root -g) node tools/mock-render.js --overlay --half   # 6 immagini: galaxy/ipad day, night, dry (Galaxy con scritte di Fully) + copie -half.png al 50%
NODE_PATH=$(npm root -g) node tools/mock-render.js --dry       # solo gli scenari puliti (asciutto, niente avvisi)
```
Scrive i PNG in `tools/out/` (ignorata da git) e stampa il controllo overflow (esce con codice 1 se ci sono problemi: overflow, testo fuori schermo, avvisi/tessere sotto le scritte di Fully, font sotto il minimo, contrasto WCAG insufficiente, card con piu' del 25% di vuoto, etichette del grafico sovrapposte, orario sport nascosto, numero tessere, piu' di 3 eventi oggi o 2 sport, radar senza etichetta); stampa anche il font piu' piccolo e il contrasto piu' basso di ogni scenario. Per vedere le pagine a mano: `python3 -m http.server` e aprire `index.html` / `ipad.html` (le API reali devono essere raggiungibili).

Vincolo: solo JavaScript ES5 in `app.js` e nelle pagine (niente let/const/arrow/template/fetch). Ad ogni modifica a `app.js` aumentare `?v=N` in entrambe le pagine.
