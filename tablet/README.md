# Tablet meteo + sport + agenda

Pannello a muro per Galaxy Tab 2 (Android 6, Fully Kiosk) e iPad 2 (iOS 9, Safari). Regole di progetto in `CLAUDE.md`, piani in `docs/`.

## URL
| Dispositivo | URL | Viewport |
|---|---|---|
| Galaxy Tab 2 | https://miglio100588.github.io/miglio-digital/tablet/ | 1024x600 |
| iPad 2 | https://miglio100588.github.io/miglio-digital/tablet/ipad.html | 1024x768 |

## File
- `index.html`: layout Galaxy. `ipad.html`: layout iPad. Ognuno definisce `var LAYOUT = {...}` e include `app.js?v=4`.
- `app.js`: tutta la logica (meteo, daylight, radar, sport, agenda). CONFIG in testa. Ogni render controlla che l'elemento esista.
- `tools/mock-render.js`: screenshot con dati finti. `docs/`: piani e foto di riferimento.

## Layout
- Galaxy: colonna sinistra con orologio, arco solare, meteo attuale e radar in basso (sotto "Please Get a License"); colonna destra con avvisi, grafico 24 ore, 6 giorni, card Agenda + Sport. Zone libere (SAFE_ZONES) spente.
- iPad: fascia alta (orologio/arco, meteo attuale, avvisi + agenda), grafico 24 ore a tutta larghezza, in basso radar grande + 6 giorni + sport.
- LAYOUT: `name`, `agendaMax`, `chartHours`, `chartVh`, `days`, `safe` (+ opzionali `agendaAlertsShrink`, `alertMax`, `sportMax`).

## Fonti
| Blocco | Fonte | Refresh |
|---|---|---|
| Meteo, grafico, giorni, avvisi calcolati | Open-Meteo | 15 min |
| Radar | RainViewer + mappa Esri Dark Gray | 10 min |
| F1 | Jolpica | 30 min |
| Sport, allerte ufficiali | Foglio Google, scheda `Sport` (JSONP `sportCb`) | 30 min |
| Agenda | Stesso foglio, scheda `Agenda` (JSONP `agendaCb`) | 30 min, ridisegno ogni minuto |

Agenda: colonne `titolo | data | ora | fine | calendario | aggiornato`; mostra gli eventi non ancora finiti entro 7 giorni, max `agendaMax`.

## Scheduled task
| Nome | ID | Quando |
|---|---|---|
| Tablet meteo – aggiorna sport | trig_01DhaB9UdibLedkTysnYrFGD | 6:52 e 15:52 |
| Tablet meteo – agenda | trig_01KzDmZAdYmyviYz3ddctDVJ | ogni 2 ore, 6:52–20:52 |

## Provare in locale
```
cd tablet
NODE_PATH=$(npm root -g) node tools/mock-render.js --overlay      # Galaxy con scritte di Fully + iPad
```
Scrive i PNG in `tools/out/` (ignorata da git) e stampa il controllo overflow (esce con codice 1 se ci sono problemi). Per vedere le pagine a mano: `python3 -m http.server` e aprire `index.html` / `ipad.html` (le API reali devono essere raggiungibili).

Vincolo: solo JavaScript ES5 in `app.js` e nelle pagine (niente let/const/arrow/template/fetch). Ad ogni modifica a `app.js` aumentare `?v=N` in entrambe le pagine.
