
# Ottimizzazione Mobile del Budget Spreadsheet

## Problema Attuale

La tabella del Budget Spreadsheet mostra 5 colonne (Voce di Spesa, Importo, Pagato, Residuo, Stato) che su mobile escono dalla schermata. Le colonne "Pagato", "Residuo" e "Stato" sono tagliate o nascoste, richiedendo lo scroll orizzontale.

## Soluzione

Sostituire la tabella con un layout a card su mobile (sotto i 768px), mantenendo la tabella su desktop. Stessa strategia gia usata con successo nella pagina Tesoreria.

## Dettaglio Tecnico

**File: `src/components/budget/BudgetSpreadsheet.tsx`**

### Layout Mobile (card-based)
Su mobile, ogni voce di budget diventa una card compatta con:
- **Riga 1**: Nome voce (bold) + Importo allineato a destra
- **Riga 2**: Fornitore/placeholder + Badge stato (Saldato/Parziale/In Attesa)
- **Riga 3**: Pagato e Residuo su una riga con label, solo se rilevanti

Le categorie restano collassabili con chevron, e la riga "Totale Generale" diventa una card evidenziata con i 3 valori (Importo, Pagato, Residuo) su griglia 3 colonne.

### Implementazione
1. Importare `useIsMobile` da `@/hooks/use-mobile`
2. Aggiungere un blocco condizionale: `{isMobile ? <MobileView /> : <DesktopTable />}`
3. La vista mobile usa `div` con border e padding invece di `Table/TableRow/TableCell`
4. Le categorie header mostrano solo Nome + Totale Importo (il resto visibile espandendo)
5. L'header della colonna "Importo (su X previsti/pianificati/confermati)" diventa un sottotitolo sopra la lista
6. Il totale generale usa una griglia a 3 colonne con etichette piccole sopra i valori

### Colonna "Stato" su mobile
Il badge di stato (Saldato/Parziale/In Attesa) viene compattato in un indicatore piccolo accanto all'importo, non come colonna separata.

### Nessuna modifica alla logica
Tutti i calcoli, le query e la logica di espansione categorie restano identici. Cambia solo il rendering.
