
# Suddivisione Equa Allocazioni Contributori

## Problema
Quando segni un pagamento come "Pagato" e aggiungi i contributori, devi calcolare a mano quanto spetta a ciascuno. Es: 671 EUR diviso 2 = 335.50 EUR ciascuno, da inserire manualmente.

## Soluzione
Aggiungere un pulsante "Dividi Equamente" che appare quando ci sono 2 o piu contributori nell'allocazione. Cliccandolo, l'importo della rata viene diviso automaticamente tra tutti i contributori presenti.

Stessa logica gia implementata con successo nel `MarkPaymentDialog` (il dialog della Tesoreria), dove esiste gia il pulsante "Suddividi Equamente tra N Contributori".

## Dettaglio Tecnico

**File: `src/components/vendors/PaymentPlanTab.tsx`**

### Modifiche
1. Aggiungere un pulsante con icona `Sparkles` (come nel MarkPaymentDialog) tra la lista contributori e il riepilogo allocazione
2. Il pulsante appare solo quando `editingAllocations.length >= 2`
3. Al click: calcola `paymentAmount / editingAllocations.length`, arrotonda a 2 decimali, e imposta l'importo su ogni allocazione
4. Testo del pulsante: "Dividi Equamente tra N Contributori"

### Posizione nel layout
Il pulsante viene inserito dopo la lista delle card contributori (riga ~1007) e prima del blocco di riepilogo allocazione (riga ~1009).

### Logica
```
const handleAutoDivide = () => {
  const paymentAmount = calculatePaymentAmount(payment, 0, index);
  const perContributor = paymentAmount / editingAllocations.length;
  const rounded = parseFloat(perContributor.toFixed(2));
  setEditingAllocations(
    editingAllocations.map(a => ({ ...a, amount: rounded.toString() }))
  );
};
```

### Import
Aggiungere `Sparkles` agli import da `lucide-react` (gia usato nel progetto).

Nessuna modifica al DB, nessun cambio di logica di salvataggio. Solo un pulsante di utilita nella UI.
