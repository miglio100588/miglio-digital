# PIANO v3 — layout Galaxy rivisto, layout iPad, agenda, mockup di verifica

Pianificato da Opus, da eseguire con un subagente Sonnet. Leggi prima `../CLAUDE.md`.

## Obiettivi
1. Estrarre tutta la logica JS da `index.html` in `app.js` condiviso, senza cambiarne il comportamento.
2. Galaxy (`index.html`, 1024×600): radar in basso nella **colonna sinistra** (sotto la scritta "Please Get a License"), agenda a destra, togliere le zone libere (SAFE_ZONES = false).
3. Nuovo `ipad.html` (1024×768) che sfrutta lo spazio in più: radar grande.
4. Nuovo blocco **Agenda** dalla scheda `Agenda` del foglio.
5. `tools/mock-render.js` per gli screenshot di verifica, con dati finti e simulazione delle scritte di Fully.

## 1. app.js (logica condivisa)
- Sposta in `app.js` tutto lo `<script>` attuale di `index.html`, mantenendo il CONFIG in testa.
- Ogni funzione di render controlla che il suo elemento esista (`if (!$('x')) return;`), così i layout possono omettere blocchi.
- La pagina definisce, prima di includere `app.js`, un oggetto `var LAYOUT = {name: 'galaxy'|'ipad', agendaMax: 3|5, chartHours: 25, days: 6, safe: false};` e app.js lo legge con valori di default.
- Inclusione: `<script src="app.js?v=3"></script>` in fondo al body.
- I tile del radar si ridisegnano se cambia la dimensione del contenitore. `rKey` c'è già: assicurati che `loadRadar` ricostruisca i frame con la geometria attuale.

## 2. Agenda
- JSONP gviz su `sheet=Agenda`, callback `agendaCb`. Stesso `cellStr` (usa `f` per le date).
- Mostra gli eventi che non sono finiti (gli eventi di tutto il giorno valgono fino a fine giornata; un evento con `fine` vale fino a quell'ora), ordinati, al massimo `LAYOUT.agendaMax`.
- Riga: pallino colorato (Personale #7CC4FF, Famiglia #7BD88F, Festività #FF8A7A) + quando + titolo con ellissi.
  - Quando: "Oggi 18:30", "Domani 09:00", "Gio 16 · 20:00"; per tutto il giorno "Oggi", "Ven 17".
- Nessun evento: "Nessun impegno nei prossimi 7 giorni" in grigio.
- Ricarica con lo stesso intervallo del foglio sport (30 min) e ridisegna ogni minuto (gli eventi passati spariscono).

## 3. Layout Galaxy (index.html, 1024×600)
Sfondo daylight, card semitrasparenti come oggi. Due colonne:
- **Sinistra (37%)**, dall'alto:
  - orologio (14vh) e data (3.4vh);
  - arco solare compatto (svg alto 8vh) con la riga alba/tramonto (2.6vh);
  - blocco attuale: icona 10vh + temperatura 10vh sulla stessa riga, condizione (3.4vh), meta su 2 righe (2.8vh);
  - **radar** card con `flex:1` (almeno 34vh): occupa tutto il resto fino in fondo. La scritta "Please Get a License" ci finisce sopra: va bene.
- **Destra (63%)**, dall'alto:
  - avvisi (max 2, compatti, 2.6vh);
  - grafico 24 ore (svg alto 22vh). Sta sotto "PLUS Features Activated": l'intestazione "PROSSIME 24 ORE" è a sinistra e non va coperta;
  - striscia 6 giorni (come oggi);
  - in fondo **due card affiancate**: Agenda (58%, titolo "AGENDA") e Sport (42%, titolo "SPORT", i 2 eventi su 2 righe ciascuno come oggi);
  - riga piede minima (2vh).
- Niente scroll né overflow: `scrollHeight <= clientHeight` per `#app` e per ogni card.

## 4. Layout iPad (ipad.html, 1024×768)
Niente scritte di Fully: nessuna zona da evitare. Griglia su 3 fasce:
- **Fascia alta (33vh)**, tre card affiancate:
  - A (32%): orologio grande (15vh), data, arco solare con riga alba/tramonto;
  - B (30%): icona 13vh + temperatura 12vh, condizione, meta su 2 righe;
  - C (38%): avvisi (se ci sono, max 2) + Agenda (max 5 eventi, o meno se ci sono avvisi).
- **Fascia centrale (24vh)**: grafico 24 ore a tutta larghezza.
- **Fascia bassa (resto)**: radar (58%, a tutta altezza) + colonna destra con striscia/lista dei 6 giorni compatta e Sport (2 eventi).
- Meta per l'iPad: le stesse apple-mobile-web-app già presenti in index.html.
- Safari 9: flex senza prefisso va bene; evita `position: sticky`, CSS grid, `gap` su flex (usa margini), `object-fit`.

## 5. tools/mock-render.js
Script Node + Playwright (Chromium in `/opt/pw-browsers`, `NODE_PATH=$(npm root -g)`).
- Uso: `node tools/mock-render.js [--overlay] [--out tools/out]`.
- Rende `index.html` a 1024×600 e `ipad.html` a 1024×768, in due fasi: giorno e notte (alba/tramonto finti rispetto all'ora attuale).
- Intercetta e simula: Open-Meteo (dati con pioggia, un'ora con grandine, raffica a 65 km/h), Jolpica, gviz (callback `sportCb` o `agendaCb` in base a `sheet=`), RainViewer JSON e tile (PNG con una macchia di pioggia **al centro del tile**, così è visibile), tile Esri (griglia scura).
- `--overlay` (solo Galaxy): aggiunge due div con le scritte "PLUS Features Activated" e "Please Get a License" nelle posizioni indicate in CLAUDE.md (rosa `rgba(255,120,180,.55)`, grassetto, circa 7vh, `pointer-events:none`).
- Per ogni render stampa un controllo automatico: overflow orizzontale del documento, card con `scrollHeight > clientHeight + 1`, elementi con testo tagliato in modo anomalo. Scrive i PNG in `tools/out/` (da aggiungere a `.gitignore`).
- Agenda finta: 4 eventi (uno di tutto il giorno oggi, uno stasera, uno domani di Famiglia, una festività).

## 6. Criteri di accettazione
- `node --check app.js` ok; nessuna sintassi ES6 (verifica con grep: `=>`, `let `, `const `, backtick).
- Screenshot Galaxy giorno/notte con `--overlay` e iPad giorno/notte: nessun overflow; radar a sinistra in basso su Galaxy; agenda e sport leggibili; min/max del grafico visibili.
- `index.html` continua a funzionare all'URL attuale.
- README aggiornato (sezioni: URL, layout, fonti, task, come provare in locale).
- **Non fare commit né push**: lascia le modifiche nella working copy. Chi ha pianificato verifica e pubblica.
