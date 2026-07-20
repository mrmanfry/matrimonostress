## Obiettivo

Il weekly digest deve:
1. Rispettare la Segregation of Duty (SoD): ogni destinatario riceve solo le sezioni per cui ha permesso di visualizzazione, e i task filtrati per assegnazione.
2. Aggregare in **una sola mail per persona** tutti i matrimoni di sua competenza (fondamentale per i planner con portfolio ampio).

## Nuovo flusso (aggregazione per destinatario)

Oggi il loop esterno è `for wedding → for recipient`, quindi un planner con 10 matrimoni riceve 10 mail. Va invertito:

1. Prima pass: raccogliere tutti i `(wedding, role, permissions_config)` di ogni user che ha `digest_enabled != false`.
2. Aggregare per `user_id` → una mappa `user → [ {wedding, role, cfg, tasks, payments, appointments}, ... ]`.
3. Invio: **una sola invoke** di `send-transactional-email` per user, con payload che contiene un array `weddings[]`.

Dedup: già oggi si deduplica per email; con l'aggregazione per user_id la dedup diventa naturale.

## Regole SoD per sezione (applicate per ciascun wedding del blocco)

- **Checklist / task** → richiede `checklist.view`.
  - `co_planner`/`planner` → tutti i task del wedding, con evidenza di quelli assegnati (`partner_role` o `assigned_to = user_id`).
  - `manager` con `checklist.view` → solo task assegnati a lui + task condivisi (nessun assegnatario). Nessun task dell'altro partner.
- **Pagamenti** → richiede `budget.view` **e** `vendor_costs.view`. Se manca, sezione + KPI "rate scadute" omessi per quel wedding.
- **Appuntamenti fornitori** → richiede `vendors.view` (o `appointments.view` se area separata). Altrimenti omessi.
- **Contatore ospiti/RSVP** → richiede `guests.view`.

Se in un wedding tutte le sezioni sono vuote/omesse → il blocco di quel wedding non compare nel digest del destinatario. Se dopo il filtro tutti i wedding sono vuoti → nessuna mail.

## Ruoli esclusi a monte

- `manager` senza alcun permesso di view utile → skip di quel wedding.
- Un `manager` che è anche co_planner altrove riceve comunque **una** mail aggregata: co_planner blocks + manager blocks (con permessi rispettati).

## Cambi al template `weekly-digest.tsx`

Riscrittura per struttura multi-wedding:
- Hero personale: `recipientName`, messaggio motivazionale, consiglio settimanale (basato sul wedding con data più vicina).
- Per ogni wedding: card con nome coppia + giorni al matrimonio + sezioni condizionali (task / pagamenti / appuntamenti) rese solo se presenti nei dati di quel blocco.
- KPI aggregati in hero (opzionale): totale task scaduti tra tutti i wedding visibili, totale € scaduti (solo se il destinatario ha visibilità finanziaria almeno su un wedding).
- Nessun blocco finanziario compare se nessun wedding include pagamenti.

## Idempotency

`idempotencyKey`: da `weekly-digest-{wedding_id}-{user_id}-{date}` diventa `weekly-digest-{user_id}-{date}`. Una sola send per persona al giorno.

## Dettagli tecnici

- File: `supabase/functions/weekly-digest/index.ts` — refactor del flusso da nested a "collect → group by user → send once".
- File: `supabase/functions/_shared/transactional-email-templates/weekly-digest.tsx` — nuova prop `weddings: WeddingBlock[]`.
- Aggiungere `permissions_config` alla select su `user_roles` (già disponibile in tabella).
- Helper locale `canView(role, cfg, area)` mirror di `hasPermission` client-side (co_planner/planner sempre `true`).
- Nessuna modifica RLS: la funzione gira come service_role; enforcement applicativo.
- Nessun invio di test in produzione. Effetto dal prossimo lunedì.

## Verifica pre-implementazione (da fare in build mode)

- Confermare con una query il valore reale di `checklist_tasks.assigned_to` per i manager: se contiene user_id UUID, filtrare per user_id; se contiene solo `partner_role`, i manager riceveranno solo task condivisi.
- Confermare l'esistenza del campo `partner_role` sul record `user_roles` selezionato (già usato oggi).
