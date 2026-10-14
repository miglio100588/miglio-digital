# Tablet meteo + sport + agenda

Pannello a muro per Galaxy Tab 2 (Android 6, Fully Kiosk) e iPad 2 (iOS 9, Safari). Regole di progetto in `CLAUDE.md`, piani in `docs/`.

## URL
| Dispositivo | URL | Viewport |
|---|---|---|
| Galaxy Tab 2 | https://miglio100588.github.io/miglio-digital/tablet/ | 1024x600 |
| iPad 2 | https://miglio100588.github.io/miglio-digital/tablet/ipad.html | 1024x768 |

## File
- `index.html`: layout Galaxy. `ipad.html`: layout iPad. Ognuno definisce `var LAYOUT = {...}` e include `app.js?v=5`.
- `app.js`: tutta la logica (meteo, tessere meteorologo, aria, daylight, luna, radar, sport, agenda). CONFIG in testa. Ogni render controlla che l'elemento esista.
- `tools/mock-render.js`: screenshot con dati finti. `docs/`: piani e foto di riferimento.

## Layout
- Galaxy (1024x600): colonna sinistra (36%) con orologio (due punti lampeggianti), data, meteo attuale con temperatura colorata, arco solare + fase lunare, radar grande in basso (sotto "Please Get a License"; la legenda sta sopra la scritta). Colonna destra: grafico 24 ore con linea colorata per temperatura, 6 giorni, 4 tessere meteorologo, box unico OGGI + SPORT con gli avvisi in testa (mai sotto "PLUS Features Activated").
- iPad (1024x768): fascia alta (orologio + arco + luna, meteo attuale, box OGGI + SPORT con avvisi), grafico 24 ore a tutta larghezza, in basso radar grande (58%) + colonna con 6 giorni in lista e 4 tessere 2x2.
- Tessere: PIOGGIA 3H (nowcast 15 min), MOTO OGGI/DOMANI (verdetto OTTIMA/DISCRETA/NO), PRESSIONE (trend 3 h), ARIA (AQI europeo + polline; se la chiamata fallisce diventa UV).
- Radar: un solo fotogramma fermo, aggiornato ogni 15 min, con etichetta "Radar HH:MM · N min fa" e legenda.
- OGGI: max 3 eventi di oggi non ancora finiti (se il box non basta, le righe si riducono); SPORT: i 2 eventi piu' vicini.
- LAYOUT: `name`, `agendaMax`, `chartHours`, `chartVh`, `days`, `safe` (+ opzionali `daysList`, `shortSun`, `alertMax`, `sportMax`).

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
NODE_PATH=$(npm root -g) node tools/mock-render.js --overlay   # 6 immagini: galaxy/ipad day, night, dry (Galaxy con scritte di Fully)
NODE_PATH=$(npm root -g) node tools/mock-render.js --dry       # solo gli scenari puliti (asciutto, niente avvisi)
```
Scrive i PNG in `tools/out/` (ignorata da git) e stampa il controllo overflow (esce con codice 1 se ci sono problemi: overflow, testo fuori schermo, avvisi/tessere sotto le scritte di Fully, piu' di 3 eventi oggi o 2 sport, radar senza etichetta). Per vedere le pagine a mano: `python3 -m http.server` e aprire `index.html` / `ipad.html` (le API reali devono essere raggiungibili).

Vincolo: solo JavaScript ES5 in `app.js` e nelle pagine (niente let/const/arrow/template/fetch). Ad ogni modifica a `app.js` aumentare `?v=N` in entrambe le pagine.
