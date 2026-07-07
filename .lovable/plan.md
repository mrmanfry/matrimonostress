## Modifica

In `src/components/budget/v2/CashflowTimeline.tsx` la lista futuri pagamenti è troncata a 8 con un placeholder statico "+ altri N pagamenti futuri". Rendere l'elenco espandibile:

1. Aggiungere uno stato locale `showAll` (default `false`).
2. Sostituire `upcoming.slice(0, 8)` con `upcoming.slice(0, showAll ? upcoming.length : 8)`.
3. Trasformare il div "+ altri N pagamenti futuri" in un pulsante testuale cliccabile che alterna tra "+ mostra altri N pagamenti" e "− mostra meno", chiamando `setShowAll(v => !v)`. Stessa tipografia attuale, hover leggero.

Nessun altro cambiamento (nessuna paginazione, nessun impatto su altre viste).
