## Problema
Nella tab **Tavoli** (`/app/tables`), nel pannello dettaglio tavolo (sia lista "Seduti" sia lista "Aggiungi ospite"), il nome dell'invitato sparisce quando le restrizioni alimentari sono lunghe. Esempio reale: Sandra Baglioni ha `dietary_restrictions = "Pesce (tutti i tipi, inclusi crostacei e molluschi)"` → il `Badge` con il testo intero occupa tutta la riga e schiaccia lo span del nome (che ha `flex-1` ma senza `min-w-0`), lasciando visibile solo "Pesce…".

## Causa
File `src/components/tables/v2/TableDetailPanel.tsx`:
- Riga ~124–131 (lista Seduti) e ~226–233 (lista Aggiungi): il `Badge` con `g.dietary_restrictions` non ha `max-width` né truncation, mentre lo span del nome non ha `min-w-0` → l'ellipsis del nome non scatta e il badge si prende tutto lo spazio.

## Fix (solo UI, zero impatto su dati / logica)
1. **Nome sempre prioritario e visibile**
   - Aggiungere `min-w-0` allo span del nome in entrambe le liste, così l'ellipsis funziona davvero.
2. **Badge dietary compatto**
   - Sostituire il badge testuale con un piccolo indicatore icona (es. `🍽️` o icona `Utensils` lucide) `h-5 w-5`, con `title={g.dietary_restrictions}` (tooltip nativo) per leggere il testo completo al hover.
   - Stessa cosa per il badge bambino (`👶`) — già compatto, lasciato com'è.
3. Applicare lo stesso pattern nella riga "Seduti" e nella riga "Aggiungi ospite" del `TableDetailPanel`.

Nessuna modifica a:
- Dati / Supabase
- `GuestPool.tsx` o `GuestPoolSidebar.tsx` (lì il dietary è già su riga sotto, non confligge col nome)
- Logica di assegnazione, +1, scenari, ecc.

## File toccati
- `src/components/tables/v2/TableDetailPanel.tsx` (sole modifiche di presentazione, ~6 righe)

## Verifica
- Riaprire il pannello tavolo dopo il fix: la riga di Sandra Baglioni mostra "Sandra Baglioni" + icona dietary a destra; hover sull'icona mostra il testo completo delle restrizioni.
- Zero rischio in produzione: nessuna query, nessuna mutazione, nessuna logica condivisa toccata.