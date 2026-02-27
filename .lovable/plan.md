

# Fix Onboarding per Utenti Invitati

## Il Problema

Quando un manager o planner riceve un invito via email con un codice, il link porta a `/app/dashboard?join=CODE`. Ma siccome e un utente nuovo senza matrimoni, il sistema lo rimanda a `/onboarding`, dove deve creare un matrimonio da zero -- cosa assurda perche il matrimonio esiste gia.

## La Soluzione

Aggiungere un flusso "Unisciti con codice" direttamente nella pagina di Onboarding, in modo che l'utente invitato possa scegliere tra:

1. **Crea un nuovo matrimonio** (flusso attuale con nomi + data)
2. **Ho un codice di invito** (inserisce il codice e accede direttamente)

Inoltre, preservare il parametro `?join=CODE` dalla URL originale cosi che se l'utente arriva da un link email, il codice venga pre-compilato.

## Modifiche

### 1. Onboarding.tsx - Aggiungere "Step 0" con scelta iniziale

Prima dei 2 step attuali, mostrare una schermata iniziale:

```text
+----------------------------------+
|          Benvenuto!              |
|                                  |
|  [Crea un Nuovo Matrimonio]      |
|                                  |
|  -- oppure --                    |
|                                  |
|  [Ho un codice di invito]        |
|  Inserisci il codice ricevuto    |
|  [________WED-XXXX_________]    |
|  [Accedi al Matrimonio]          |
+----------------------------------+
```

- Se l'utente sceglie "Crea", procede con Step 1 e 2 come oggi
- Se l'utente inserisce un codice, viene chiamata la stessa RPC `join_wedding_by_code` gia usata da `JoinWeddingDialog`
- Se la URL contiene `?join=CODE`, il campo codice viene pre-compilato e la sezione codice viene aperta automaticamente

### 2. ProtectedRoute.tsx - Preservare il query param `join`

Quando il `ProtectedRoute` con `requireWedding` rimanda a `/onboarding`, deve portarsi dietro il parametro `?join=CODE` dalla URL originale, cosi:

```text
/app/dashboard?join=WED12345
  -> redirect a /onboarding?join=WED12345
```

### 3. Nessuna modifica al backend

La RPC `join_wedding_by_code` esiste gia e funziona. Basta riusarla nell'onboarding.

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/Onboarding.tsx` | Aggiungere schermata iniziale con opzione "join con codice" |
| `src/guards/ProtectedRoute.tsx` | Preservare `?join=` nel redirect a `/onboarding` |

## UX

- L'utente invitato che arriva dal link email vedra il campo codice gia compilato e dovra solo cliccare "Accedi al Matrimonio"
- L'utente che arriva senza codice vedra le due opzioni e potra scegliere
- Dopo il join riuscito, `refreshAuth()` viene chiamato e l'utente viene mandato direttamente alla dashboard

