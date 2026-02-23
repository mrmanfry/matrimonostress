

# Migliorare Layout Card Categorie Budget

## Problema
Attualmente il costo e posizionato sotto il nome della categoria in un testo piccolo grigio. Su mobile e desktop risulta poco leggibile, specialmente per importi grandi.

## Soluzione
Spostare l'importo a destra della card, allineato al bordo destro, con il nome della categoria a sinistra. Layout `flex` con `justify-between`.

## Dettaglio Tecnico

**File: `src/pages/BudgetLegacy.tsx`** - righe 572-581

Struttura attuale:
```
[pallino] [nome]
          [importo piccolo grigio]
```

Nuova struttura:
```
[pallino] [nome]              [importo bold]
```

- Rimuovere il `<p>` dell'importo dal div interno (sotto il nome)
- Aggiungere un nuovo elemento a destra con `text-sm font-semibold` e allineamento destro
- Il div padre (riga 572) mantiene `flex items-center gap-3` e aggiunge `justify-between` per spingere l'importo a destra
- Il nome resta troncato con `truncate` per non sovrapporsi all'importo
- L'importo usa `shrink-0 text-right` per non comprimersi

Nessuna modifica al DB o alla logica. Solo riposizionamento CSS.

