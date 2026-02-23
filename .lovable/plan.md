

# Fix: Errore "duplicate key" nel salvataggio allocazioni contributori

## Causa del Bug

Quando aggiungi un contributore cliccando "Aggiungi Contributore", il sistema inserisce sempre il **primo contributore della lista** (`contributors[0].id`) come default. Se aggiungi due contributori senza cambiare il select dropdown del secondo, entrambi hanno lo **stesso `contributor_id`**.

Al salvataggio, il sistema tenta di inserire due righe con la stessa coppia `(payment_id, contributor_id)` nella tabella `payment_allocations`, che ha un vincolo di unicita su questa coppia. Da qui l'errore "duplicate key".

## Soluzione

Due correzioni nel file `src/components/vendors/PaymentPlanTab.tsx`:

1. **Prevenzione**: quando si aggiunge un nuovo contributore, selezionare automaticamente il **primo contributore non ancora presente** nella lista. Se tutti sono gia presenti, non permettere l'aggiunta (disabilitare il pulsante).

2. **Validazione al salvataggio**: prima di inserire le allocazioni, verificare che non ci siano `contributor_id` duplicati. Se ci sono, mostrare un errore e bloccare il salvataggio.

### Modifica 1 - Pulsante "Aggiungi Contributore" (riga ~937)
- Trovare il primo contributore il cui `id` non e gia in `editingAllocations`
- Usare quello come default invece di `contributors[0].id`
- Disabilitare il pulsante se tutti i contributori sono gia presenti

### Modifica 2 - Validazione in `handleSavePayment` (riga ~619)
- Prima dell'insert, controllare che non ci siano `contributor_id` duplicati in `editingAllocations`
- Se duplicati trovati, mostrare toast di errore e interrompere il salvataggio

### Modifica 3 - Select contributore (riga ~960)
- Nel dropdown di selezione contributore, disabilitare i contributori gia selezionati in altre righe per evitare duplicati visivamente

