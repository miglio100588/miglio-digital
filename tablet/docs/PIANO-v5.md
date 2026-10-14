# PIANO v5 — leggibilità a distanza (WCAG 2.2) e spazio organizzato al millimetro

Pianificato da Opus, da eseguire con un subagente Sonnet. Leggi prima `../CLAUDE.md`. Vincoli invariati: ES5, niente librerie, `app.js` condiviso, bump `app.js?v=6`.

## Problema (foto reale del Galaxy, 14/10 ore 09:45)
- Da mezzo metro non si leggono: tessere (MOTO OGGI, PRESSIONE, PIOGGIA), agenda, sport, etichette del grafico e dei giorni.
- Il box OGGI+SPORT occupa troppo spazio e ha molto vuoto sotto.
- Sullo sfondo azzurro di giorno il testo bianco e grigio ha poco contrasto. I font sottili (weight 300) spariscono.
- Lo devono leggere anche i genitori di Alberto: grande, semplice, evidente.

## Regole di leggibilità (valgono per entrambi i layout)
Riferimento: il Galaxy ha uno schermo da 7" a 1024×600, quindi 1vh ≈ 0,9 mm; la lettura è da 0,5–2 m.
| Ruolo | Galaxy (min) | iPad (min) | Peso |
|---|---|---|---|
| Testo più piccolo ammesso (etichette, note) | **3,6vh (≈22 px)** | **3,2vh (≈25 px)** | 500 |
| Testo corrente (agenda, sport, giorni) | 4,2vh | 3,8vh | 500 |
| Valori delle tessere | 6,5vh | 6vh | 600 |
| Temperatura attuale | 12vh | 12vh | 500 |
| Orologio | 15vh | 16vh | 400 (mai 300) |
- Unica eccezione al minimo: il credito "RainViewer · Esri…", che non è un contenuto.
- **Contrasto WCAG 2.2 AA**: almeno 4,5:1 per tutto il testo sotto 24 px, almeno 3:1 per il testo grande e per gli elementi grafici essenziali (linea della temperatura, barre di pioggia, pallino del radar). Per riuscirci:
  - tutto il testo sta **dentro card scure**: sfondo almeno `rgba(6,14,32,.62)` di giorno e `rgba(0,0,0,.45)` di notte, mai testo direttamente sul gradiente azzurro;
  - testo secondario al massimo `rgba(255,255,255,.86)`, niente grigi più tenui;
  - accenti: giallo #FFD98A, azzurro #9BD3FF, verde #8BE59E, rosso #FF8A80, arancio #FFB066. Verifica che rispettino 4,5:1 sulle card.
- Niente testo in maiuscoletto spaziato sottile per le etichette: maiuscolo, peso 600, minimo 3,6vh.
- Meno cose, più grandi: ogni informazione che non si legge da 1 metro va tolta o ingrandita.

## Layout Galaxy (index.html, 1024×600), griglia precisa
Padding pagina 1,6vh/1,6vw, gap 1,2vh tra le card. **Sinistra 38% | destra 62%.**

**Sinistra (dall'alto):**
1. Card ORA, alta circa 27vh: orologio 15vh weight 400; sotto, data "Mercoledì 14 ottobre" 4,2vh; sotto, una riga "☀ tramonto 18:29 · tra 8h 44m" (di notte "alba 07:27 · tra …") 3,8vh. **Togli** l'arco e la luna dal Galaxy (troppo piccoli).
2. Card ADESSO, alta circa 21vh: icona 11vh + temperatura 12vh colorata a sinistra; a destra condizione 4,4vh peso 600 e sotto "Percepita 13°" 3,8vh; ultima riga "Vento 3 km/h NE" 3,8vh. **Togli** umidità e raffiche dal Galaxy (le raffiche forti arrivano già come avviso).
3. **Radar** `flex:1`, il resto della colonna (circa 40vh). Etichetta "Radar 09:40 · 5 min fa" 3,6vh su fondo scuro; legenda 3,6vh con le parole "debole" e "forte". La scritta "Please Get a License" va sopra la parte bassa del radar: va bene.

**Destra (dall'alto):**
1. **Grafico 24 ore**, card alta circa 27vh (sotto la scritta "PLUS" in alto: va bene).
   - Etichette in unità SVG tarate in modo che a schermo siano almeno 3,6vh: orari ogni 3 ore, temperature solo ogni 6 ore più min e max.
   - min e max in 4vh peso 700 con l'ora: "max 22° 16:00", "min 10° 08:00".
   - Togli la riga delle percentuali di pioggia sotto gli orari: le barre restano.
   - Icone meteo ogni 3 ore, almeno 4,5vh.
   - Niente titolo "PROSSIME 24 ORE" (spazio prezioso, il grafico è autoesplicativo).
2. **Giorni**: striscia di **5 giorni** (non 6), card alta circa 17vh: nome giorno 3,8vh peso 600 ("Oggi", "Gio"), icona 6vh, "22° 10°" con max 4,6vh peso 700 giallo e min 4,6vh azzurro; pioggia sotto solo se ≥ 30%, in 3,6vh ("💧70%" senza emoji: usa una gocciolina SVG o il testo "70%").
3. **Tessere**: **3 tessere** (non 4), alte circa 16vh: **MOTO**, **PIOGGIA** e **ARIA/PRESSIONE**, cioè la tessera ARIA che alterna ogni 10 secondi con PRESSIONE. Etichetta 3,6vh peso 600; valore 6,5vh peso 700 colorato; nota di una riga 3,6vh. Se la nota è troppo lunga va accorciata nel codice, non tagliata con "…": scrivi testi brevi ("Asciutto fino 12:30", "Freddo al mattino 10°", "Stabile 1028").
4. **OGGI + SPORT**: card alta solo quanto serve (`flex:none`), al massimo circa 26vh:
   - due colonne 55/45 con titoli "OGGI" e "SPORT" 3,6vh peso 600;
   - agenda: massimo **3** righe da 4,2vh (orario in giallo, peso 600; titolo con ellissi);
   - sport: **2** righe compatte su UNA riga ciascuna, "MIL Salisburgo–Milan · Dom 18:45" 4vh, con il canale omesso se non sta;
   - gli avvisi (max 2) diventano una fascia sopra le due colonne, 4vh peso 700, e tolgono righe all'agenda (minimo 1).
- Lo spazio che avanza a destra va **al grafico** (`flex:1` sul grafico, min 24vh), non a vuoti in fondo.
- Togli la riga piede "Boara Polesine · aggiornato…". L'ora dell'ultimo aggiornamento meteo va in piccolo (3,6vh) dentro la card ADESSO, e solo se il dato ha più di 30 min (in arancio: "dati delle 09:13").

## Layout iPad (ipad.html, 1024×768)
Stesse regole e dimensioni minime della tabella.
- **Fascia alta**: [ORA con orologio 16vh, data, riga sole e luna più grande] [ADESSO completo, con umidità e raffiche] [OGGI+SPORT, alto quanto il contenuto].
- **Fascia centrale**: grafico 24 ore, almeno 24vh.
- **Fascia bassa**: radar 58% | colonna destra con 5 giorni come lista (righe da 5vh) + 4 tessere 2×2 (valori 6vh).
- Niente ellissi nei titoli sport: il canale va su una seconda riga, oppure si omette.

## mock-render.js: controlli automatici nuovi (obbligatori)
1. **Dimensione minima**: per ogni elemento con testo visibile (esclusi il credito del radar e i testi dentro l'SVG del radar), la font-size calcolata deve essere ≥ 22 px su Galaxy e ≥ 24,5 px su iPad. Per i testi dentro gli SVG del grafico usa `getBoundingClientRect().height` dell'elemento `<text>`: deve essere ≥ 18 px su Galaxy e ≥ 20 px su iPad. Stampa l'elenco di chi sfora.
2. **Contrasto WCAG**: per ogni elemento di testo, colore del testo dalla computed style; colore di sfondo campionato da uno screenshot in cui il testo è reso trasparente (inietta `* { color: transparent !important; text-shadow: none !important; }` e `svg text { fill: transparent !important }`), prendendo la mediana dei pixel nel rettangolo dell'elemento. Calcola il rapporto WCAG (luminanza relativa sRGB) e segnala < 4,5:1 (< 3:1 se il testo è ≥ 24 px peso ≥ 700 oppure ≥ 32 px).
3. **Spazio sprecato**: segnala le card con più del 25% di altezza vuota sotto l'ultimo figlio.
4. Restano i controlli esistenti: overflow, overlay di Fully, numero di tessere e righe.
- Usa la foto reale come confronto visivo: `/root/.claude/uploads/c82f2234-8a52-5806-ba90-9de5ca26dcc9/42a3dc6d-image.jpg`.

## Criteri di accettazione
- I controlli automatici sono puliti su galaxy-day, galaxy-night (`--overlay`), galaxy-dry, ipad-day, ipad-night e ipad-dry.
- A occhio, ogni PNG ridotto al 50% (simula la distanza: `--half` salva anche una copia scalata) resta leggibile.
- ES5, `node --check app.js`.
- Aggiorna `README.md` e la sezione "Preferenze di Alberto" di `CLAUDE.md` con le nuove regole di leggibilità.
- **Nessun commit e nessun push.**
