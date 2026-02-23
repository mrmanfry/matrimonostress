

# Voci di Budget Cliccabili e Eliminabili

## Cosa cambia

Quando espandi una categoria nel Budget Spreadsheet e vedi le singole voci di spesa:

1. **Voci assegnate a un fornitore**: cliccando sulla riga si apre la schermata dettaglio spesa (la stessa che c'e nella pagina fornitore, con le tab "Dettaglio Costi" e "Piano Pagamenti")
2. **Voci placeholder (non assegnate)**: mostrano due azioni:
   - Pulsante "Da assegnare" (gia presente) per assegnare un fornitore
   - Icona cestino per eliminare la voce dal budget
3. **Le righe diventano cliccabili** con hover evidenziato per indicare che sono interattive

## Dettaglio Tecnico

**File: `src/components/budget/BudgetSpreadsheet.tsx`**

### Nuovo stato e import
- Importare `ExpenseItemTabs` da `@/components/vendors/ExpenseItemTabs`
- Importare `Trash2` da `lucide-react`
- Aggiungere `AlertDialog` per conferma eliminazione
- Nuovo stato: `expenseTabsOpen`, `selectedExpenseItem` (con id, vendorId, categoryId), `deleteDialogOpen`, `itemToDelete`

### Logica di apertura dettaglio
- Cliccando su una riga con fornitore assegnato (`!isPlaceholder`): apre `ExpenseItemTabs` passando `vendorId`, `categoryId`, `expenseItemId`
- Cliccando su una riga placeholder: apre comunque `ExpenseItemTabs` ma con il `vendorId` fittizio (l'item esiste gia nel DB con `vendor_id = null`, ma `ExpenseItemTabs` richiede un `vendorId` -- servira un piccolo adattamento)

### Problema `vendorId` per placeholder
`ExpenseItemTabs` filtra le spese per `vendor_id`. Per i placeholder (senza fornitore), si passera direttamente l'`expenseItemId` e si aprira il dialog in modalita "edit singolo item". Il componente gia supporta `expenseItemId` non-null, che carica direttamente quell'item specifico dal DB.

### Eliminazione voci placeholder
- Icona cestino accanto a "Da assegnare" per le voci non assegnate
- Click sull'icona apre un `AlertDialog` di conferma ("Sei sicuro di voler eliminare questa voce?")
- La conferma esegue: DELETE `payments` dove `expense_item_id`, DELETE `expense_line_items` dove `expense_item_id`, DELETE `expense_items` dove `id`, poi invalidate query `["budget-spreadsheet"]`

### Modifiche alla UI (desktop + mobile)

**Desktop (`renderDesktopView`)**:
- `TableRow` delle voci: aggiungere `onClick` per aprire il dettaglio, `cursor-pointer`
- Per i placeholder: aggiungere icona cestino nella colonna "Voce di Spesa"

**Mobile (`renderMobileView`)**:
- La card di ogni voce diventa cliccabile (apre il dettaglio)
- Per i placeholder: aggiungere icona cestino accanto a "Da assegnare"

### Nuovo dialog nel render
```
<ExpenseItemTabs
  open={expenseTabsOpen}
  onOpenChange={setExpenseTabsOpen}
  vendorId={selectedExpenseItem?.vendorId || ""}
  categoryId={selectedExpenseItem?.categoryId || null}
  expenseItemId={selectedExpenseItem?.id || null}
  onSaved={() => queryClient.invalidateQueries({ queryKey: ["budget-spreadsheet"] })}
  calculationMode={globalMode}
/>
```

### Gestione vendor_id vuoto
Per i placeholder senza vendor, `ExpenseItemTabs` riceve `vendorId=""`. Il componente carica l'item tramite `expenseItemId` (che funziona gia -- il `loadExpenseItem` fa una query per ID, non filtra per vendor). L'unico punto critico e `createNewExpenseItem` che non verra chiamato perche passiamo sempre un `expenseItemId` esistente.

