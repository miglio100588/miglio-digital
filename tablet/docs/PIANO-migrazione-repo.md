# PIANO — migrazione in repo dedicato `tablet-meteo` (da eseguire in Claude Code sul PC Linux)

Pianificato da Opus. In Claude Code: Opus rilegge questo piano e lo affina se serve, poi lo fa **eseguire a un subagente Sonnet**; alla fine Opus verifica.

## Obiettivo
Spostare il progetto da `miglio-digital/tablet/` a un repo suo, `tablet-meteo`, seguendo le regole di `~/progetti/_template/LEGGIMI.md`, **senza mai lasciare il tablet senza pagina**.

## Vincoli
- Il Galaxy punta oggi a `https://miglio100588.github.io/miglio-digital/tablet/`. Quell'URL deve continuare a funzionare: alla fine diventa un **redirect** al nuovo indirizzo.
- GitHub Pages gratuito funziona solo su repo **pubblici**. Lo standard di Alberto è repo privato + **Cloudflare Pages** con GitHub Action (vedi `~/progetti/portfolio/`: `pubblica.yml`, `SETUP.md`). Usa questo.
- Regola dei progetti online: lavora su un branch e fai merge su `main` solo quando Alberto conferma. Niente modifiche DNS senza chiedere.
- Le immagini di riferimento (es. `docs/foto-galaxy-*.jpg`) non vanno in git: spostale su Drive `~/GoogleDrive/Claude/tablet-meteo/`.

## Passi
1. **Pre-check**: `gh auth status`, `mountpoint ~/GoogleDrive`, e che esista `~/progetti/portfolio/` per copiare il modello di Action Cloudflare. Leggi come `portfolio` gestisce `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` (secret del repo).
2. **Storia git**: in un clone temporaneo di `miglio100588/miglio-digital`, `git subtree split --prefix=tablet -b tablet-only`, così la storia della cartella resta.
3. **Crea il progetto** con lo standard: `~/progetti/_template/nuovo-progetto.sh tablet-meteo` (repo privato `miglio100588/tablet-meteo` + cartella Drive). Poi importa la storia: `git pull ../tmp-clone tablet-only --allow-unrelated-histories`. Unisci il `CLAUDE.md` del template con quello del progetto: tieni le sezioni del template (Cos'è, Dove stanno le cose, Regole, Comandi) e quelle specifiche (URL, flusso Opus→Sonnet, vincoli ES5, overlay Fully, fonti, schema fogli, task).
4. **Struttura**: sito statico in `sito/` (`index.html`, `ipad.html`, `app.js`); `tools/` e `docs/` fuori da `sito/`, così non vengono pubblicati. Aggiorna i percorsi in `tools/mock-render.js`.
5. **Cloudflare Pages**: progetto `tablet-meteo` (wrangler `pages project create`), Action `.github/workflows/pubblica.yml` copiata da portfolio che pubblica `sito/` su push a `main`. Secret del repo come in portfolio (chiedi ad Alberto solo se mancano).
6. **Verifica** su branch/preview: `https://<branch>.tablet-meteo.pages.dev/` e `/ipad.html` caricano, `mock-render.js` passa.
7. **Merge su main** dopo l'ok di Alberto, e verifica `https://tablet-meteo.pages.dev/`. Facoltativo, solo se Alberto lo chiede: dominio `meteo.miglio.digital`.
8. **Redirect dal vecchio URL**: in `miglio-digital/tablet/` sostituisci tutto con un solo `index.html` e un `ipad.html`, ciascuno con `<meta http-equiv="refresh" content="0; url=https://tablet-meteo.pages.dev/...">` e un link di riserva. Solo dopo che il punto 7 è verificato.
9. **Pulizia**: aggiorna il `CLAUDE.md` di miglio-digital (se esiste) o il README per dire che il tablet è migrato. Aggiungi `tablet-meteo` a `Google Drive/Claude/Organizzazione progetti/PROGETTI.md`.
10. **Comunica ad Alberto**: nuovo URL per Fully (facoltativo, il redirect funziona) e per l'iPad.

## Dopo la migrazione
Prosegui con `PIANO-v6.md`: le Pages Functions di questo repo servono come proxy per l'iPad.

## Attenzione
- Android 6 e Cloudflare: il certificato potrebbe non essere riconosciuto. Fully ha "Ignore SSL Errors" attivo, mentre l'iPad no: prova l'URL su iPad prima di togliere il vecchio.
- I due scheduled task di Claude scrivono sul foglio Google e non dipendono dal repo: nessuna modifica.
