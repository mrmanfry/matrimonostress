

# Semplificazione Budget: Eliminare la colonna "Stimato"

## ✅ COMPLETATO

### Modifiche effettuate:

1. **`AddBudgetItemDialog.tsx`** — Nuove voci budget salvano in `fixed_amount` (non più `estimated_amount`)
2. **`BudgetSpreadsheet.tsx`** — Rimossa colonna "Stimato", rimossa mutation `updateEstimate`, rinominata colonna in "Importo", rimossi campi `estimated`/`totalEstimated` dalle interface
3. **`AssignVendorDialog.tsx`** — `needsContractConfirmation` ora si attiva quando `vendor_id` è null (placeholder), pre-popola con `fixed_amount`

### Risultato:
- Una sola colonna "Importo": ogni voce contribuisce al totale, che abbia un fornitore o meno
- Il fallback `estimated_amount` nella libreria di calcolo continua a funzionare per dati legacy
