

## Problema
I costi delle camere inseriti nella sezione Pernotto (`accommodation_rooms`) vivono in un sistema separato rispetto ai costi dei fornitori (`expense_items` + `expense_line_items`). Risultato: il vendor "Hotel X" mostra €0 nella card Fornitori, anche se in Pernotto ci sono camere con prezzi. Questo è inaccettabile per un gestionale finanziario.

## Soluzione: Auto-sync expense_item da accommodation_rooms

Quando si aggiungono/modificano/eliminano camere in un hotel, il sistema crea o aggiorna automaticamente un `expense_item` di tipo `fixed` collegato a quel vendor, con `total_amount` = somma di `price_per_night * nights` di tutte le camere. Questo fa fluire il costo automaticamente in:
- Card Fornitori (Totale Spese)
- Dettaglio Fornitore (tab Spese)
- Budget
- Treasury

### Modifiche

**1. `src/components/accommodation/HotelCard.tsx`**
- Dopo ogni operazione CRUD sulle camere (add/edit/delete), chiamare una funzione `syncAccommodationExpense(vendorId, weddingId)` che:
  1. Calcola il totale camere: `SELECT SUM(price_per_night * nights) FROM accommodation_rooms WHERE vendor_id = ?`
  2. Cerca un `expense_item` esistente con `vendor_id` e `description = 'Pernotto – Camere'`
  3. Se esiste → `UPDATE total_amount, fixed_amount`
  4. Se non esiste e totale > 0 → `INSERT` nuovo expense_item di tipo fixed
  5. Se esiste e totale = 0 → `DELETE` (nessuna camera rimasta)
- Invalidare anche le query dei vendor dopo il sync

**2. Nuova utility `src/lib/accommodationSync.ts`**
- Funzione `syncAccommodationExpense(vendorId: string, weddingId: string)` che incapsula la logica di sync
- Riutilizzabile da qualsiasi punto che modifica le camere

**3. Nessuna modifica al DB**
- Si usa la struttura `expense_items` esistente, con una `description` convenzionale ("Pernotto – Camere") per identificare l'expense auto-generato
- L'expense_item sarà di tipo `fixed` con `total_amount` = somma costi camere

### Flusso
1. Utente aggiunge camera "101" a €80/notte × 2 notti = €160
2. Sistema crea/aggiorna expense_item con `total_amount = 160`, `expense_type = 'fixed'`
3. Card Fornitori mostra immediatamente €160
4. Treasury e Budget vedono il costo
5. Se l'utente modifica o elimina camere, l'importo si aggiorna automaticamente

