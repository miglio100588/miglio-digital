# Tablet meteo + sport

Pagina a schermo intero per Galaxy Tab 2 (Android 6, Fully Kiosk Browser).

- Meteo: Open-Meteo (Rovigo), aggiornamento ogni 15 min
- F1: Jolpica API live
- Milan / Italia / U21 + canali: foglio Google "Tablet Meteo – Sport", aggiornato ogni mattina da uno scheduled task
- Daylight: sfondo e luminosità seguono alba/tramonto (fasi dawn, day, golden, dusk, night + notte fonda 23-6)
- Grafico 24 ore con min/max, pioggia oraria, notte ombreggiata; avvisi grandine/temporali/vento/gelo calcolati da Open-Meteo
- Allerte ufficiali (Protezione Civile Veneto/ARPAV/MeteoAlarm) e sport: righe del foglio, aggiornate dal task alle 6:52 e 15:52
- Sport: i 2 eventi più vicini (F1, Milan, Italia, U21)
- SAFE_ZONES: lascia libere le zone delle scritte di Fully senza licenza (alto a destra, basso a sinistra)

Configurazione in testa allo script: coordinate, intervalli, SAFE_ZONES, fascia notturna, opacità/luminosità per fase, ID del foglio.
Vincolo: solo JavaScript ES5 (niente let/const/arrow/fetch) per il WebView di Android 6.
