# PIANO v6 — venerdì 16/10 in Claude Code (dopo la migrazione)

Pianificato da Opus il 14/10 dopo le foto reali di Galaxy e iPad. Si esegue in Claude Code: Opus rilegge e affina, un subagente Sonnet esegue, Opus verifica sugli screenshot prima di ogni merge.

## Ordine di lavoro di venerdì
1. **Migrazione** del repo: `PIANO-migrazione-repo.md` (Cloudflare Pages + Pages Functions).
2. **Fix iPad**: dati meteo e radar non arrivano (sezione A). Richiede le Pages Functions del punto 1.
3. **Canale TV** sempre visibile (sezione B).
4. **Giro di frontend design** per un layout accattivante (sezione C), con la skill `frontend-design`.

## A. iPad: "Caricamento…", "Meteo non disponibile", "Radar non disponibile"
Situazione al 14/10 (foto, iPad 2 iOS 9.3.5, uguale in Safari e in Chrome, che su iOS usa lo stesso motore WebKit):
- funzionano: l'orologio, l'agenda e lo sport, cioè il foglio Google via JSONP da `docs.google.com`;
- non funzionano: meteo (XHR verso `api.open-meteo.com`), radar (XHR verso `api.rainviewer.com` e immagini da `tilecache.rainviewer.com`), grafico, giorni e tessere.

**Ipotesi**: iOS 9 non riconosce i certificati di questi domini (catena Let's Encrypt ISRG Root X1, aggiunta a iOS solo dalla 10). Il fallback `http://` di Open-Meteo è bloccato come contenuto misto, perché la pagina è in https. Il Galaxy funziona solo perché Fully ha "Ignore SSL errors".

**Passi**:
1. **Diagnosi prima di correggere**: aggiungere `?debug=1` che mostra in un riquadro lo stato di ogni fonte (meteo, aria, radar JSON, tile radar, mappa Esri, Jolpica, foglio): esito, codice HTTP, `onerror`/timeout, ora. Alberto apre `ipad.html?debug=1` e manda una foto. Conferma o smentisce l'ipotesi.
2. **Fix (se confermata)**: proxy sullo **stesso dominio** con Cloudflare Pages Functions, così il dispositivo parla solo con il dominio della pagina, che già carica:
   - `/api/meteo` → Open-Meteo forecast (cache 10 min);
   - `/api/aria` → Open-Meteo air quality (cache 60 min);
   - `/api/radar` → RainViewer `weather-maps.json` (cache 5 min);
   - `/api/radar-tile/{path}` → tile RainViewer (cache 1 ora);
   - `/api/f1` → Jolpica (cache 30 min);
   - eventualmente `/api/mappa/{z}/{y}/{x}` → tile Esri, se anche quelle falliscono.
   `app.js` usa questi percorsi relativi quando esistono e torna alle URL dirette come riserva. Bonus: meno chiamate dai dispositivi e cache comune.
3. Verificare che il certificato del dominio Cloudflare (`*.pages.dev` o il dominio personale) sia accettato da iOS 9. Se non lo è, valutare il dominio personale con un certificato compatibile, oppure un altro hosting.
4. Il test vero è sull'iPad: Alberto conferma con una foto.

## B. Canale TV: niente compromessi
- Il canale (es. "Sky · NOW", "DAZN · Sky", "Rai 1") deve essere **sempre visibile** per ogni evento sportivo, su Galaxy e su iPad, con le regole di leggibilità della v5 (minimo 22 px su Galaxy).
- Si recupera spazio con il redesign della sezione C, non accorciando il testo. Se serve, abbreviazioni standard decise nel foglio dal task (`canale` max 14 caratteri), mai l'ellissi.
- Aggiungere il controllo in `mock-render.js`: il canale di ogni evento sport è visibile e non troncato.

## C. Giro di frontend design (layout accattivante)
- In Claude Code usa la skill **frontend-design**: direzione estetica decisa e non da template, gerarchia forte, tipografia curata, sempre entro i vincoli tecnici (ES5, niente librerie, niente web font pesanti: valutare un solo web font leggero via `@font-face` locale nel repo, se il WebView di Android 6 e Safari 9 lo reggono).
- Restano non negoziabili:
  - regole di leggibilità della v5 (minimi 22/25 px, contrasto AA, controlli automatici di `mock-render.js`);
  - box unico Oggi+Sport con canale TV;
  - radar statico;
  - daylight;
  - avvisi mai sotto la scritta "PLUS" di Fully.
- Prima di implementare: 2–3 proposte di layout come mockup statici (screenshot da `mock-render.js`) per Galaxy e iPad. Alberto sceglie, poi si implementa la scelta.
- Spunti emersi:
  - sul Galaxy l'etichetta "max" del grafico finiva sotto la scritta "PLUS": va spostata;
  - sul Galaxy reale c'è un leggero riflesso: preferire alto contrasto e superfici scure piene.

## Riferimenti
- Foto del 14/10 (Galaxy v5 e iPad con i dati non caricati): mostrate in chat. Prima del giro di design, chiedi ad Alberto di rimetterle su Drive in `Claude/tablet-meteo/foto/`.
- Stato del codice: v5 (`app.js?v=6`), commit `aafde5d` su `miglio-digital`.
