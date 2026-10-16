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

## Prossimi passi (venerdì 16/10, in Claude Code)
1. Migrazione: `docs/PIANO-migrazione-repo.md`.
2. `docs/PIANO-v6.md`: fix iPad (meteo e radar non caricano su iOS 9), canale TV, **tema di default "cruscotto BMW classico"** giorno/notte, giro di frontend design, web radio (4 stazioni), legenda radar in fondo, MOTO alba→tramonto, nuovi indicatori.

## Flusso di lavoro (obbligatorio): Opus decide, Haiku e Sonnet lavorano
La sessione principale gira su **Opus** (`.claude/settings.json`: `"model": "opus"`). Alberto dà gli input a Opus; Opus non scrive codice da solo se non per ritocchi di poche righe.

| Fase | Chi | Modello | Note |
|---|---|---|---|
| Capire, raccogliere informazioni | `esploratore` | Haiku | Ricerche nel codice, nelle API e nelle fonti, in sola lettura. Più esploratori in parallelo se le domande sono indipendenti |
| Pianificare | Opus (sessione principale) | Opus | Scrive o aggiorna `docs/PIANO-*.md`: obiettivo, sezioni numerate, file, criteri di accettazione |
| Proposte grafiche | `designer` | Sonnet | Mockup A/B/C in `tools/proposte/`; Alberto sceglie |
| Implementare | `implementatore` | Sonnet | Riceve il percorso del piano e le sezioni (non il testo incollato). Sezioni indipendenti in parallelo solo se toccano file diversi |
| Collaudare | `collaudatore` | Haiku | Dopo ogni implementazione: check, mock-render, screenshot. Se KO, Opus rimanda all'implementatore solo il report |
| Verifica finale | Opus | Opus | Rilegge diff e PNG `-half`, poi commit; push/merge secondo le regole sopra |

Regole di efficienza:
- Opus non legge file interi se basta un report: delega a esploratore e collaudatore, che rispondono in poche righe.
- Ai subagenti si passa il percorso del piano e i numeri di sezione, mai lunghi testi incollati.
- Un giro implementazione → collaudo per sezione grande; per i ritocchi piccoli, un solo giro finale.
- Deploy = push su `main` (oggi GitHub Pages, dopo la migrazione Cloudflare Pages). Il tablet si ricarica da solo ogni 6 ore (o Reload da Fully).

## Vincoli tecnici (non negoziabili)
- **Solo JavaScript ES5**: niente `let`/`const`, arrow function, template literal, `fetch`, Promise, classi, spread, `Array.from`, `Object.assign`. WebView di Android 6 e Safari 9.
- Niente librerie esterne né build: HTML + CSS + JS statici. Logica condivisa in `app.js`; i layout sono `index.html` (Galaxy) e `ipad.html` (iPad).
- Cache: ogni modifica a `app.js` aumenta il parametro `?v=N` nei tag `<script>` di entrambe le pagine.
- Certificati: i dispositivi hanno trust store vecchi. Fully ha "Ignore SSL errors" attivo; Safari/Chrome su iOS 9 no. **Sull'iPad al 14/10 meteo e radar non caricano** (il foglio Google sì): soluzione prevista con proxy sullo stesso dominio (Cloudflare Pages Functions), vedi `docs/PIANO-v6.md` sezione A.
- Unità in `vh`/`vw`; testare sempre 1024×600 e 1024×768.

## Overlay di Fully (Galaxy, senza licenza)
Fully disegna due scritte rosa semitrasparenti sopra la pagina, che dall'HTML non si possono togliere:
- "PLUS Features Activated": in alto a destra (circa x 45–98%, y 5–12%).
- "Please Get a License": in basso a sinistra (circa x 2–40%, y 88–97%; misurata sulla foto del 14/10, il mock usa font 6,2vh).
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
- Un solo box OGGI+SPORT: max 3 eventi di oggi + i 2 eventi sportivi più vicini. Allerte e grandine in evidenza, in testa al box. Il box è alto quanto serve (niente vuoto sotto); con gli avvisi si riduce a gradini (titoli, righe agenda, seconda riga sport).
- Tessere meteorologo: Galaxy 3 (MOTO, PIOGGIA 3H, ARIA/PRESSIONE che alternano ogni 10 s); iPad 4 (MOTO, PIOGGIA 3H, PRESSIONE, ARIA). Note di una riga, scritte corte, mai tagliate.
- Radar statico (niente animazione), il più grande possibile. Effetto WOW ma leggibile a 2 metri.
- **Canale TV sempre visibile** per ogni evento sportivo, su entrambi i dispositivi: nessun compromesso. Si guadagna spazio con il layout, non togliendo il canale.
- Vuole un layout accattivante: giro di frontend design previsto (vedi `docs/PIANO-v6.md`).
- Tema di default: cruscotto analogico BMW classico (anni '80–'90), giorno e notte secondo alba e tramonto. Il daylight attuale resta come tema alternativo.
- Va in moto dall'alba al tramonto: l'indicatore MOTO usa quella finestra.
- Web radio preferite: Radio Malibù, Radio Gemini, Radio 105, Rai Radio 1.
- Testi in italiano, stile asciutto.

## Regole di leggibilità (v5, WCAG 2.2; leggono anche i genitori di Alberto)
- Dimensioni minime: Galaxy 3,7vh (22 px) per ogni testo, iPad 3,3vh (25 px). Eccezione unica: il credito "RainViewer · Esri…". Testo corrente 4–4,2vh (Galaxy) / 3,4–3,8vh (iPad), valori tessere 6–6,5vh, temperatura 12vh, orologio 15vh (Galaxy) / 16vh (iPad), peso mai sotto 400 (orologio) e 500 (resto).
- Contrasto: almeno 4,5:1 per il testo sotto 24 px, 3:1 per testo grande (≥24 px bold o ≥32 px). Tutto il testo sta in card scure (rgba(6,14,32,.62) di giorno, rgba(0,0,0,.45) di notte); testo secondario al massimo rgba(255,255,255,.86); accenti #FFD98A giallo, #9BD3FF azzurro, #8BE59E verde, #FF8A80 rosso (solo testo grande), #FFB066 arancio.
- Niente maiuscoletto sottile; meno cose ma grandi: se un'informazione non si legge da 1 m si toglie o si ingrandisce.
- `node tools/mock-render.js --overlay --half`: controlli automatici (font minimo, contrasto WCAG campionato da screenshot a testo trasparente, spazio sprecato > 25%, overflow, etichette del grafico sovrapposte, orario sport nascosto, tessere) e copie `-half.png` al 50% per simulare la distanza. Devono essere tutti puliti prima di ogni commit.
