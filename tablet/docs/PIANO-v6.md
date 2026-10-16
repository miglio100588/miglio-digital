# PIANO v6 — venerdì 16/10 in Claude Code (dopo la migrazione)

Pianificato da Opus il 14/10 dopo le foto reali di Galaxy e iPad. Si esegue in Claude Code: Opus rilegge e affina, un subagente Sonnet esegue, Opus verifica sugli screenshot prima di ogni merge.

## Ordine di lavoro di venerdì (agenti: vedi "Flusso di lavoro" in CLAUDE.md)
1. **Migrazione** del repo: `PIANO-migrazione-repo.md` (Cloudflare Pages + Pages Functions). Esecuzione: `implementatore`; verifica: `collaudatore`.
2. **Fix iPad**: dati meteo e radar non arrivano (sezione A). Richiede le Pages Functions del punto 1.
3. **Correzioni funzionali**: canale TV (B), legenda radar (E), MOTO alba→tramonto (F).
4. **Tema di default "cruscotto BMW classico"** (H) + giro di frontend design (C): proposte del `designer`, scelta di Alberto, poi implementazione.
5. **Web radio** (D).
6. **Nuovi indicatori** (G): Alberto ne sceglie 2–4 dalla tabella.

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


## D. Web radio
- Un **piccolo pulsante** (icona nota musicale, discreto ma toccabile, almeno 48 px) apre una fila di **4 stazioni predefinite**: **Radio Malibù**, **Radio Gemini**, **Radio 105**, **Rai Radio 1**. Un tocco fa partire la stazione, un secondo tocco la ferma. La stazione attiva è evidenziata e il suo nome compare nel pulsante finché suona.
- Tecnica: `<audio>` HTML5 con gli URL di streaming (mp3 o aac). L'`esploratore` deve trovare e verificare gli URL ufficiali e attuali di ogni stazione, preferendo https, e controllare che suonino su Android 6 (Fully) e iOS 9.
- Attenzione:
  - la pagina è in https: uno stream http è contenuto misto e viene bloccato, e iOS 9 può rifiutare certificati recenti. Valuta un proxy dello stream con Pages Functions (verifica i limiti di Cloudflare per lo streaming lungo) oppure la radio solo sul Galaxy;
  - in Fully attiva l'autoplay audio se serve;
  - la radio parte solo con un tocco, mai da sola;
  - se la radio sta suonando, il ricaricamento automatico delle 6 ore aspetta che si fermi.

## E. Legenda del radar
- La legenda "debole ■■■■ forte" va **in fondo al radar, a tutta larghezza**, anche sopra la scritta "Please Get a License": Alberto la preferisce lì perché è più evidente.

## F. MOTO: finestra reale alba → tramonto
- Alberto va in moto **dall'alba al tramonto**. La finestra è `sunrise → sunset` presi da `daily.sunrise/sunset` di Open-Meteo, non più 08–19.
  - Prima del tramonto: finestra di oggi, solo le ore **rimanenti** da adesso al tramonto.
  - Dopo il tramonto: tutta la finestra di domani ("MOTO DOMANI").
- Mostra anche **la fascia migliore** (ore consecutive asciutte e più calde), ad esempio "Meglio 11–16".
- Nota con il motivo del giudizio: "Freddo all'alba 6°", "Pioggia dalle 15".
- Soglie come nel PIANO-v4 §3, ricalcolate sulla nuova finestra.

## G. Indicatori "da utente" (Alberto ne sceglie 2–4)
| Indicatore | Cosa dice | Dati | Perché |
|---|---|---|---|
| **Fotovoltaico oggi** | "Produzione stimata 14 kWh", con il confronto con ieri | `shortwave_radiation_sum` di Open-Meteo × 4 kWp × circa 0,8 | Impianto da 4 kWp con batteria da 7 kWh |
| **Freddo in moto** | "A 90 km/h percepiti 4°" | Wind chill sulla minima della finestra moto a 90 km/h | Decide come vestirsi |
| **Nebbia** | "Nebbia probabile 03–08" | `visibility` < 1 km oppure temperatura − rugiada < 1° | Polesine, moto e auto |
| **Rispetto a ieri** | "Oggi +3° più caldo di ieri" | `past_days=1` | Immediato, anche per i genitori |
| **Riscaldamento** | "Minima stanotte 8° alle 06" | Minima notturna | Si regola sulle minime notturne |
| **Bucato fuori** | "Bucato: sì fino alle 16" | Sole + vento + umidità < 70% + niente pioggia | Utile in casa |
| **Brina/ghiaccio** | "Brina all'alba" | Temperatura ≤ 2° e rugiada vicina | Moto, auto, piante |
| **Luce** | "Luce 11h 02m · −2 min rispetto a ieri" | Alba e tramonto di oggi e di ieri | Effetto "wow" stagionale |
| **Livello Adige** | Livello a Boara Pisani con tendenza | ARPAV/CFD Veneto, da verificare se il dato è aperto | Boara è sull'Adige |
- Ogni indicatore diventa una tessera con le regole della v5. Sul Galaxy la tessera a rotazione può far girare 2–3 indicatori ogni 10 s.

## H. Tema di default "cruscotto BMW classico" (giorno e notte)
**Richiesta di Alberto (16/10)**: il tema predefinito deve somigliare al classico cruscotto analogico BMW storico (E30/E34/E36, anni '80–'90), con variante giorno e notte secondo alba e tramonto. Il tema "daylight" attuale resta disponibile come alternativa (pulsante discreto o parametro `?tema=daylight`).

**Linguaggio visivo** (ispirazione, senza loghi né marchi):
- **Quadranti neri opachi** con cornice cromata/grigio scuro sottile e lieve vignettatura interna, su fondo nero o antracite. Niente sfondi colorati.
- **Strumenti circolari con lancetta**:
  - temperatura attuale come grande quadrante principale "tachimetro", con scala min–max della giornata, tacche e numeri bianchi, lancetta arancio-rossa con perno centrale;
  - quadranti piccoli tipo "contagiri/carburante/temperatura acqua" per pressione, pioggia 3h e vento;
  - la tessera MOTO come "econometro".
- **Tipografia**: numeri bianchi in stile DIN condensato. Usa font di sistema condensati (`"Roboto Condensed", "sans-serif-condensed"` su Android, `"Avenir Next Condensed"` su iOS) con fallback; nessun web font pesante.
- **Spie "Check Control"**: gli avvisi (grandine, vento, gelo, allerte ufficiali) diventano spie con icona e testo, ambra per l'attenzione e rossa per il pericolo, in una fila come le spie del cruscotto. Spente o grigie quando non c'è nulla.
- **Display LCD** per orologio, data e righe testuali (agenda, sport con canale TV): cifre su fondo verde-grigio scuro o nero, in stile computer di bordo.
- **Giorno**: numeri e tacche bianchi, lancette arancio-rosso (#FF4F1A circa), accenti bianchi.
- **Notte** (dopo il tramonto, fino all'alba): **illuminazione arancio-ambra** tipica BMW (#FF7A00 / #FFA000 circa) su numeri, tacche e testi, lancette rosso-arancio luminose, fondo nero pieno. Il dimming notturno resta.
- Radar e grafico 24 ore dentro "quadranti" coerenti: cornice tonda o rettangolare stondata, tacche, colori ambra di notte.

**Vincoli**:
- leggibilità v5 (minimi 22/25 px, contrasto AA: ambra e bianco su nero passano ampiamente; verifica comunque con `mock-render`);
- quadranti e lancette in SVG inline (ES5, niente canvas pesante); animazione della lancetta solo al cambio di valore, con una transizione CSS breve;
- niente loghi, stemmi o nomi di marchio nell'interfaccia: è un'ispirazione stilistica.

**Processo**:
- il `designer` prepara 2 proposte del tema per Galaxy e iPad (A: fedele, quadranti grandi; B: ibrida, un quadrante grande più tessere LCD), giorno e notte, in `tools/proposte/`;
- Alberto sceglie;
- l'`implementatore` porta la scelta in `index.html`, `ipad.html` e `app.js`;
- il `collaudatore` verifica.
