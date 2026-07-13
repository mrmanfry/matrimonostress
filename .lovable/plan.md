
## Problema

Il `MountainChart` in `src/components/budget/v2/CashflowTimeline.tsx` disegna dentro un `viewBox="0 0 720 260"` con `preserveAspectRatio="none"` e `width="100%"`. Su schermi larghi il viewBox viene **stirato orizzontalmente** (a 1200+ px reali contro 720 di viewBox): linee verticali diventano sottili e sbiadite, il tratteggio "da pagare" si allunga e sembra sgranato, i testi degli assi (se scalassero) sarebbero deformati. È il classico effetto "immagine a bassa risoluzione stirata" che descrivi.

## Soluzione

Rendere il canvas SVG **1:1 con i pixel reali del container**: 1 unità viewBox = 1 pixel. Nessuno stiramento, tratti crisp, tratteggio regolare, tipografia netta.

### Come

1. Avvolgere l'SVG in un `<div ref={containerRef}>` che occupa il 100% della larghezza.
2. Con un `ResizeObserver`, misurare la larghezza reale del container e salvarla in stato (`Wpx`).
3. Usare `Wpx` come nuova `W` (con fallback 720 al primo render). `H` resta 260.
4. `viewBox={`0 0 ${W} ${H}`}` + `preserveAspectRatio="xMidYMid meet"` + `width={W}` / `height={H}` (o `width="100%"` — a quel punto è indifferente perché coincidono).
5. Tutti i calcoli (`padL`, `innerW`, `xFor`, `yFor`, path builder, tooltip hit-test) già usano `W`/`innerW` come variabili → basta trasformarle in valori derivati da `Wpx` senza altre modifiche di logica.
6. Aggiornare `onMove`: siccome ora `xPx === xViewBox`, la conversione `(xPx / rect.width) * W` resta corretta (è già proporzionale), nessun bug.

### Bonus qualità (piccoli, stesso file)

- Aggiungere `shape-rendering="geometricPrecision"` sull'`<svg>` per linee/aree più pulite.
- Assicurare `strokeWidth` costante (nessun scale) — automatico con la fix sopra.
- Il pattern tratteggiato "da pagare" (stroke-dasharray) sarà finalmente regolare perché non più deformato.

## Scope

Solo `src/components/budget/v2/CashflowTimeline.tsx`, funzione `MountainChart` (aggiunta ref + ResizeObserver + rimozione `preserveAspectRatio="none"`). Nessun cambio di dati, logica, colori, layout esterno.

## Rischio

Minimo. La logica di scala è già parametrizzata su `W`/`innerW`. Il ResizeObserver è già usato altrove nel progetto (pattern noto).
