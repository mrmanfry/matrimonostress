
# Elimina Account: Logica Contestuale e Sicura

## Problema Attuale

Il bottone "Elimina Account" attualmente fa solo sign-out e mostra un messaggio "contatta il supporto". Non elimina nulla. L'utente vuole una logica reale e contestuale.

## Scenari di Eliminazione

L'utente ha descritto 3 scenari distinti che il dialog deve gestire:

```text
Scenario A: "Lascia questo matrimonio"
  Condizione: Sono co_planner MA c'e un altro co_planner sullo stesso matrimonio
  Azione: Elimino solo il mio user_role + dati personali legati a quel matrimonio
  Risultato: Il matrimonio resta per l'altro co_planner. Se ho altri matrimoni (planner/sposo), restano.

Scenario B: "Elimina matrimonio"
  Condizione: Sono l'UNICO co_planner su questo matrimonio (nessun altro co_planner)
  Azione: Elimino TUTTO il matrimonio (invitati, fornitori, pagamenti, ecc.) + il mio user_role
  Risultato: Matrimonio sparisce. Se ho altri matrimoni (come planner), restano.

Scenario C: "Elimina tutto il mio account"
  Condizione: L'utente sceglie esplicitamente di eliminare TUTTO
  Azione: Elimino TUTTI i matrimoni dove sono l'unico co_planner, lascio quelli dove c'e un altro co_planner, elimino il profilo
  Risultato: Account completamente rimosso dalla piattaforma.
```

## Soluzione

### 1. Edge Function `delete-account` (nuovo)

Creare una edge function che gestisce la logica server-side (serve il service_role per eliminare dati cross-tabella e, opzionalmente, l'utente auth).

La funzione riceve un parametro `mode`:
- `leave_wedding`: rimuove solo il `user_role` dell'utente per il wedding corrente
- `delete_wedding`: elimina tutti i dati del matrimonio (cascade) + il user_role
- `delete_everything`: per ogni matrimonio dell'utente, applica la logica A o B, poi elimina il profilo e l'utente auth

Logica interna:
1. Verifica JWT e identifica l'utente
2. Per `leave_wedding`: verifica che esista un altro co_planner, poi DELETE da user_roles
3. Per `delete_wedding`: verifica che sia l'unico co_planner, poi DELETE da weddings (le FK con CASCADE puliscono il resto)
4. Per `delete_everything`: loop su tutti i matrimoni dell'utente, applica la logica corretta, poi elimina profilo e utente auth

### 2. UI Dialog migliorato (`AccountSettingsCard.tsx`)

Sostituire il dialog attuale con un dialog a step che:
1. Mostra lo scenario rilevato automaticamente
2. Chiede conferma con contesto chiaro

**Step 1 - Scelta azione:**
- Se c'e un altro co_planner: mostra opzione "Lascia questo matrimonio" (i dati restano per il partner)
- Se sono l'unico co_planner: mostra avviso "Sei l'unico proprietario, eliminando il tuo account verranno eliminati TUTTI i dati del matrimonio"
- Sempre visibile: opzione "Elimina completamente il mio account da tutta la piattaforma"

**Step 2 - Conferma:**
- Riepilogo di cosa verra eliminato
- Campo "Digita ELIMINA" per confermare
- Bottone rosso finale

### 3. Verifica co_planner nel componente

Prima di mostrare il dialog, fare una query per contare quanti `co_planner` ci sono su questo matrimonio:

```text
SELECT COUNT(*) FROM user_roles 
WHERE wedding_id = X AND role = 'co_planner' AND user_id != current_user
```

Questo determina quale scenario mostrare di default.

### 4. Cascata dati nel DB

La tabella `weddings` ha gia le FK con `ON DELETE CASCADE` per la maggior parte delle tabelle figlie (guests, vendors, checklist_tasks, ecc.). Verificare che tutte le tabelle con `wedding_id` abbiano il CASCADE corretto. Se mancano, aggiungere una migrazione.

## File da modificare/creare

| File | Modifica |
|------|----------|
| `supabase/functions/delete-account/index.ts` | Nuova edge function con logica di eliminazione |
| `src/components/settings/AccountSettingsCard.tsx` | Nuovo dialog multi-step con scelta contestuale |

## Sicurezza

- La edge function valida il JWT server-side
- L'utente puo eliminare solo i propri dati (verifica `auth.uid()`)
- L'eliminazione del matrimonio e permessa solo se l'utente e l'unico co_planner
- L'eliminazione dell'utente auth usa `supabase.auth.admin.deleteUser()` con service_role
- Conferma "Digita ELIMINA" lato UI come ulteriore protezione
