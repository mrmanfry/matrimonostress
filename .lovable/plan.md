## Obiettivo
Permettere l'eliminazione di un fornitore dalla modale di modifica, con conferma esplicita che spieghi cosa verrà eliminato a cascata (spese, rate, contratti, file, appuntamenti, comunicazioni) e aggiornamento immediato della tabella/lista.

## Comportamento UX

**1. Pulsante "Elimina fornitore"**
- Aggiunto in `VendorFormModal` (visibile solo in modalità modifica, non in creazione).
- Posizionato nel footer a sinistra, stile distruttivo (rosso ink), separato dai bottoni Annulla/Salva a destra.

**2. Dialog di conferma a cascata**
- Al click apre un secondo dialog di conferma (non `window.confirm`, ma un `PaperModal` coerente con lo stile).
- Mostra un riepilogo dinamico di cosa verrà eliminato per quel fornitore specifico (conteggi reali letti dal DB):
  - N. voci di spesa + rate di pagamento collegate
  - N. contratti caricati (+ file su storage)
  - N. appuntamenti + comunicazioni
  - N. camere collegate (se struttura ricettiva) — bloccante, vedi sotto
  - N. attività in checklist collegate (verranno scollegate, non eliminate)
- Richiede di digitare il nome del fornitore (o checkbox "Confermo eliminazione definitiva") per evitare cancellazioni accidentali.
- Bottoni: "Annulla" + "Elimina definitivamente" (rosso).

**3. Esecuzione**
- Esegue la cascata (vedi sotto), mostra toast di esito.
- Chiude entrambe le modali.
- In `/app/vendors`: invalida la query e il fornitore sparisce dalla tabella.
- In `/app/vendors/:id`: naviga indietro a `/app/vendors`.

## Logica di cascata

Ordine di eliminazione (dal foglia alla radice, per evitare violazioni FK):

```text
1. Storage: rimuovi tutti i file in bucket "vendor-contracts" sotto "{wedding_id}/{vendor_id}/"
2. vendor_contracts        WHERE vendor_id = X       → delete
3. payment_allocations     WHERE payment_id IN (...) → delete (via expense_items)
4. payments                WHERE expense_item_id IN (... vendor_id = X) → delete
5. expense_line_items      WHERE expense_item_id IN (... vendor_id = X) → delete
6. expense_items           WHERE vendor_id = X       → delete
7. vendor_appointments     WHERE vendor_id = X       → delete
8. vendor_communications   WHERE vendor_id = X       → delete
9. checklist_tasks         WHERE vendor_id = X       → UPDATE vendor_id = NULL (scollega, non elimina)
10. accommodation_rooms    → se presenti, BLOCCA con messaggio "Rimuovi prima le camere dalla sezione Pernotto"
11. vendors                WHERE id = X              → delete
```

Le camere `accommodation_rooms` hanno `vendor_id NOT NULL` ed è una gestione dedicata (sezione Pernotto): non si eliminano silenziosamente. Se presenti, blocchiamo l'eliminazione e indichiamo all'utente di rimuoverle prima.

## Centralizzazione

Creo helper `deleteVendorCascade(vendorId, weddingId)` in **`src/lib/vendorAggregates.ts`** (già esistente) — usato sia da `Vendors.tsx` (lista) sia da `VendorDetails.tsx` (scheda). Restituisce `{ blocked?: string; deletedCounts: {...} }`.

Helper `previewVendorDeletion(vendorId)` che ritorna i conteggi per il dialog di conferma.

## File modificati

| File | Modifica |
|------|---------|
| `src/lib/vendorAggregates.ts` | + `previewVendorDeletion()`, + `deleteVendorCascade()` |
| `src/components/vendors/v2/VendorFormModal.tsx` | Aggiunto prop `onDelete?: (vendorId: string) => Promise<void>` e bottone "Elimina fornitore" nel footer in modalità edit |
| `src/components/vendors/v2/DeleteVendorDialog.tsx` (nuovo) | `PaperModal` di conferma con anteprima conteggi e digitazione nome |
| `src/pages/Vendors.tsx` | Handler `handleDeleteVendor`, passato a `VendorFormModal`, invalida query |
| `src/pages/VendorDetails.tsx` | Stesso handler, dopo delete naviga a `/app/vendors` |

## Note tecniche

- Non tocco lo schema DB: non aggiungo `ON DELETE CASCADE` perché alcune FK richiedono logica condizionale (es. checklist da scollegare, accommodation da bloccare). Tutto gestito a livello applicativo per controllo fine e messaggistica chiara.
- Storage: `supabase.storage.from('vendor-contracts').list(prefix)` per recuperare i file, poi `.remove(paths)`.
- Tutte le query filtrate anche per `wedding_id` per sicurezza (multi-tenant).
