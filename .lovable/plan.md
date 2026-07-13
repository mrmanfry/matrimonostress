## Problema

Alla creazione di un matrimonio, un trigger DB (`generate_checklist_on_wedding_creation`) inserisce automaticamente 12 task "di sistema" con scadenze calcolate rispetto alla data delle nozze. Questi task finiscono nelle email di digest settimanale e nei reminder giornalieri, anche a utenti che si sono solo registrati e non hanno mai aperto la checklist — creando "promemoria fantasma" con date inventate.

## Soluzione proposta

Doppia protezione: **non generarli più in automatico** e **non spedirli mai finché l'utente non li ha toccati**.

### 1. Stop generazione automatica

- Rimuovere il trigger `generate_checklist_on_wedding_creation` e la function `generate_checklist_tasks()`.
- I nuovi matrimoni partono con checklist vuota.

### 2. Template opt-in dalla UI

- In `src/pages/Checklist.tsx`, quando la lista è vuota, mostrare un empty state con CTA "Carica checklist consigliata" che inserisce i task standard (usando il template già esistente in `src/utils/checklistTemplates.ts`).
- L'utente sceglie consapevolmente di popolare la checklist → nessuna sorpresa via email.

### 3. Filtro difensivo nelle email

Anche per i matrimoni esistenti che hanno già i task di sistema in DB, escluderli dalle notifiche finché non sono stati modificati dall'utente:

- `supabase/functions/weekly-digest/index.ts` (query `checklist_tasks`): aggiungere `.eq('is_system_generated', false)` **oppure** un filtro "è stato toccato" (es. `updated_at > created_at + interval` o campo dedicato).
- `supabase/functions/check-checklist-reminders/index.ts`: stessa esclusione.

Approccio più semplice e sicuro: escludere sempre `is_system_generated = true` dai promemoria. I task di sistema entrano nei reminder solo se l'utente li modifica (a quel punto un piccolo trigger imposta `is_system_generated = false`, così diventano "propri").

### 4. Pulizia dei task fantasma esistenti (opzionale, da confermare)

Due strade:
- **A**: cancellare tutti i task con `is_system_generated = true` che non sono mai stati toccati (status = 'pending', nessuna descrizione/vendor aggiunti, updated_at = created_at). Pulisce lo storico.
- **B**: lasciarli dove sono ma nasconderli dalle email (grazie al filtro del punto 3) e mostrarli in UI con un badge "suggerito" + azione "Rimuovi suggerimenti".

Consiglio **B** per non distruggere dati di utenti che magari li stavano usando.

## File toccati

- Nuova migration: DROP trigger + DROP function + trigger di "promozione" (task modificato → `is_system_generated = false`).
- `supabase/functions/weekly-digest/index.ts`
- `supabase/functions/check-checklist-reminders/index.ts`
- `src/pages/Checklist.tsx` (empty state + bottone "Carica checklist consigliata" che riutilizza `checklistTemplates.ts`).
- `src/components/checklist/*` per il badge "suggerito" (se scegliamo B).

## Domande prima di procedere

1. Confermi opzione **B** (nascondere i task di sistema dalle email + badge "suggerito" in UI), o preferisci **A** (cancellarli fisicamente)?
2. Il bottone "Carica checklist consigliata" nell'empty state va bene, o preferisci nessuna generazione template e checklist totalmente da zero?