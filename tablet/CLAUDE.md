# tablet-meteo

Cos'è: pannello a muro meteo + radar + agenda + sport per casa di Alberto (Via Peschiera 20, Boara Polesine, Rovigo), su Galaxy Tab 2 e iPad 2.

## Dove stanno le cose
- Codice: oggi `miglio-digital/tablet/` (GitHub `miglio100588/miglio-digital`, GitHub Pages). **Da migrare** in `~/progetti/tablet-meteo/` → GitHub `miglio100588/tablet-meteo` + Cloudflare Pages: vedi `docs/PIANO-migrazione-repo.md`.
- Documenti (foto del tablet, screenshot di riferimento): Google Drive `Claude/tablet-meteo/` (su Linux `~/GoogleDrive/Claude/tablet-meteo/`).
- Segreti: nessuno nel codice. Le API usate sono pubbliche e senza chiave.

## Regole (dal template di `~/progetti`)
- Mai committare `.env`, chiavi o password.
- Niente file pesanti in git (immagini di riferimento, video, zip): vanno su Drive.
- A fine sessione: commit con messaggio chiaro e `git push`.
- Il sito si pubblica da `main`: lavora su un branch e fai merge su `main` solo quando Alberto conferma (eccezione: piccoli fix già verificati con gli screenshot, se Alberto ha chiesto di pubblicare).
- Mai deploy, modifiche DNS o pannelli di hosting senza chiedere.

## Comandi
- Verifica sintassi: `node --check app.js`
- Mockup/screenshot: `NODE_PATH=$(npm root -g) node tools/mock-render.js --overlay` (scenario pulito: `--dry`); i PNG finiscono in `tools/out/`
- In locale: `python3 -m http.server 8080` dentro la cartella del sito, poi `http://localhost:8080/` e `/ipad.html`

## URL
| Dispositivo | URL | Viewport |
|---|---|---|
| Galaxy Tab 2 (Android 6.0.1, LineageOS, Fully Kiosk senza licenza) | https://miglio100588.github.io/miglio-digital/tablet/ | 1024×600 landscape |
| iPad 2 (iOS 9.3.5, Safari, "Aggiungi a Home" + Accesso Guidato) | https://miglio100588.github.io/miglio-digital/tablet/ipad.html | 1024×768 landscape |

## Flusso di lavoro (obbligatorio)
1. **Pianifica con Opus**: ogni modifica parte da un piano scritto in `docs/PIANO-*.md` (obiettivo, file toccati, specifiche di layout, criteri di accettazione, test).
2. **Esegui con un subagente Sonnet**: il piano viene passato a un subagente con `model: sonnet`, che implementa e prova.
3. **Verifica prima del deploy**: chi ha pianificato rilegge diff e screenshot (`tools/mock-render.js`) e solo dopo fa commit + push. Mai pubblicare senza screenshot controllati.
4. Deploy = push su `main`; GitHub Pages ripubblica in circa 1 minuto. Il tablet si ricarica da solo ogni 6 ore (o Reload da Fully).

## Vincoli tecnici (non negoziabili)
- **Solo JavaScript ES5**: niente `let`/`const`, arrow function, template literal, `fetch`, Promise, classi, spread, `Array.from`, `Object.assign`. WebView di Android 6 e Safari 9.
- Niente librerie esterne né build: HTML + CSS + JS statici. Logica condivisa in `app.js`; i layout sono `index.html` (Galaxy) e `ipad.html` (iPad).
- Cache: ogni modifica a `app.js` aumenta il parametro `?v=N` nei tag `<script>` di entrambe le pagine.
- Certificati: i dispositivi hanno trust store vecchi. Fully ha "Ignore SSL errors" attivo; Safari no. Prevedi fallback (http per Open-Meteo, messaggio "non disponibile" per radar e foglio).
- Unità in `vh`/`vw`; testare sempre 1024×600 e 1024×768.

## Overlay di Fully (Galaxy, senza licenza)
Fully disegna due scritte rosa semitrasparenti sopra la pagina, che dall'HTML non si possono togliere:
- "PLUS Features Activated": in alto a destra (circa x 45–98%, y 5–12%).
- "Please Get a License": in basso a sinistra (circa x 2–45%, y 88–97%).
Sotto ci vanno contenuti grafici che restano leggibili (radar, grafico). Foto di riferimento: `docs/foto-galaxy-2026-10-14.jpg`.
`tools/mock-render.js --overlay` simula le scritte per verificarlo.

## Fonti dati
| Blocco | Fonte | Refresh |
|---|---|---|
| Meteo, grafico 24h, giorni, avvisi calcolati | Open-Meteo (gratis, senza chiave) | 15 min |
| Radar | RainViewer `weather-maps.json` (gratis: zoom max 7, schema colore 2), solo l'ultimo fotogramma, fermo + mappa Esri World Dark Gray | 15 min |
| Nowcast pioggia 3h, pressione, UV | Open-Meteo (`minutely_15`, `pressure_msl`, `uv_index_max`) | 15 min |
| Aria e pollini | Open-Meteo Air Quality (fallback: tessera UV) | 60 min |
| F1 | Jolpica `api.jolpi.ca/ergast/f1/current/next.json` | 30 min |
| Sport, allerte ufficiali | Foglio Google `1Vyjea-9AzZGETDihlg3CWY4TMPLNdmLtUFvVvVxDaUc`, scheda `Sport` (JSONP gviz) | 30 min |
| Agenda | Stesso foglio, scheda `Agenda` (JSONP gviz) | 30 min |

### Schema scheda `Sport`
`gruppo | titolo | data | ora | dettaglio | canale | aggiornato`. Gruppi: `F1`, `MILAN`, `ITALIA`, `U21`, `ALLERTA` (in `canale`: gialla/arancione/rossa).
gviz restituisce la data come `Date(2026,9,15)` e l'ora come `Date(1899,11,30,18,45,0)`: usa sempre il campo formattato `f`.

### Schema scheda `Agenda`
`titolo | data | ora | fine | calendario | aggiornato`. Calendario: Personale / Famiglia / Festività (mai quello di lavoro).

## Scheduled task (Claude, cloud)
| Nome | ID | Quando | Cosa |
|---|---|---|---|
| Tablet meteo – aggiorna sport | trig_01DhaB9UdibLedkTysnYrFGD | 6:52 e 15:52 | Sport + allerte → scheda Sport |
| Tablet meteo – agenda | trig_01KzDmZAdYmyviYz3ddctDVJ | ogni 2 ore, 6:52–20:52 | Google Calendar → scheda Agenda |

## Posizione
`LAT 45.10345, LON 11.79292` (Via Peschiera 20). Città mostrata: "Boara Polesine".

## Preferenze di Alberto
- Si regola su minime/massime (moto) e minime notturne (riscaldamento): min/max sempre ben visibili.
- Tema "daylight" che segue alba e tramonto; niente tema anni '70.
- Un solo box OGGI+SPORT: max 3 eventi di oggi + i 2 eventi sportivi più vicini. Allerte e grandine in evidenza, in testa al box.
- Tessere meteorologo: PIOGGIA 3H, MOTO (OTTIMA/DISCRETA/NO), PRESSIONE, ARIA/UV.
- Radar statico (niente animazione), il più grande possibile. Effetto WOW ma leggibile a 2 metri.
- Testi in italiano, stile asciutto.
