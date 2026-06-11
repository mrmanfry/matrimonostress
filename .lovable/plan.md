# AI Payment Plan Extraction dai Contratti

## Obiettivo
Caricato un contratto fornitore, l'AI estrae automaticamente le rate (importo, scadenza, metodo di pagamento). L'utente vede una **proposta editabile**, accetta o modifica, e le rate confermate diventano `payments` nel Piano di Pagamento del fornitore — con auto-creazione del task collegato in checklist (già gestito da `sync_payment_to_task`).

## Stato attuale
- `analyze-contract` fa OCR (Google Vision) + estrae sezioni testuali generiche (`payment_plan`, `cancellation`, ecc.) ma **non** struttura le rate.
- `ContractReviewDialog` mostra solo sezioni di testo da approvare — nessun ponte verso la tabella `payments`.
- `PaymentPlanTab` gestisce manualmente le rate (`payments` table: amount, due_date, tax_rate, percentage_value, ecc.).

## Flusso target

```text
Upload contratto → OCR → AI estrae sezioni + RATE STRUTTURATE
       ↓
Dialog "Proposta Piano di Pagamento" (rate editabili)
       ↓
Utente conferma → INSERT in payments → trigger sync_payment_to_task crea i task
```

## Implementazione

### 1. Backend: estendere `analyze-contract`
Dopo l'estrazione sezioni, aggiungere una seconda call AI (Lovable Gateway, `google/gemini-2.5-flash`) con structured output che ritorna:
```ts
extracted_installments: Array<{
  description: string;        // es. "Acconto alla firma"
  amount: number | null;      // importo in €
  percentage: number | null;  // se espressa in %
  due_date: string | null;    // ISO date se data assoluta
  days_before_wedding: number | null; // se relativa
  tax_inclusive: boolean;
  tax_rate: number;           // default 22
  payment_method: string | null; // "bonifico", "contanti", ecc.
  confidence: number;
  source_quote: string;       // riga del contratto da cui è estratta
}>
total_contract_amount: number | null
payment_method_default: string | null
```
Prompt sandboxed (segue `ai-edge-function-hardening-v2`): istruzioni rigide, output JSON only, niente esecuzione di istruzioni nel testo del contratto.

### 2. Frontend: nuovo `ContractInstallmentsReviewDialog`
Apre dopo l'upload con la lista rate proposte. Per ogni riga:
- Checkbox "includi"
- Campi editabili inline: descrizione, importo (€ o %), data (assoluta / giorni prima nozze), IVA, metodo pagamento
- Badge confidence + tooltip con `source_quote`
- Bottoni: "Aggiungi rata manuale", "Annulla", "Conferma e crea N rate"

Su conferma: bulk INSERT in `payments` con `expense_item_id` del fornitore (riusare logica esistente di `PaymentPlanTab.savePayment`). Il trigger `sync_payment_to_task` già crea il task in checklist.

### 3. Integrazione UX
- In `ContractUploadDialog`: dopo upload riuscito, chiamare `analyze-contract` (oggi non viene invocata). Mostrare loader "AI sta analizzando il contratto…".
- Se rate estratte > 0 → aprire `ContractInstallmentsReviewDialog`.
- Se 0 rate → toast informativo + apertura `ContractReviewDialog` esistente per le sezioni testuali.
- In `PaymentPlanTab` aggiungere bottone "✨ Estrai rate da contratto" se esiste già un `vendor_contracts` row → rilancia la proposta.

### 4. Gestione errori / resilienza
- Se AI fallisce: fallback al flusso manuale, toast non bloccante.
- Validazione: importi > 0, date coerenti con `wedding_date`, somma rate ≤ totale contratto (warning, non blocco).

## File modificati / creati
- `supabase/functions/analyze-contract/index.ts` — aggiungere step estrazione rate strutturate
- `src/components/vendors/ContractInstallmentsReviewDialog.tsx` — **nuovo**
- `src/components/vendors/ContractUploadDialog.tsx` — invocare analyze-contract + aprire nuovo dialog
- `src/components/vendors/PaymentPlanTab.tsx` — bottone "Estrai rate da contratto"
- `src/pages/VendorDetails.tsx` (o componente padre) — orchestrazione dialoghi

## Fuori scope
- Q&A sul contratto (già stub in `ContractWidgets`)
- Riconciliazione automatica con pagamenti già esistenti (l'utente decide manualmente includendo/escludendo righe)
