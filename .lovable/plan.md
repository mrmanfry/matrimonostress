

# Fix: Caricamento lento dopo login (RPC timeout race condition)

## Problema identificato

L'RPC `get_user_context` viene eseguita in **0.3ms** sul database -- il problema NON e la query. Il problema e una **race condition** nel flusso di autenticazione:

1. `initSession()` e `onAuthStateChange(SIGNED_IN)` scattano quasi simultaneamente
2. La prima chiamata RPC puo incontrare un "cold start" della connessione PostgREST e superare il timeout di 10 secondi
3. Il timeout genera un errore, l'utente vede una schermata di errore per qualche secondo
4. Solo dopo, una seconda chiamata riesce e il dashboard si carica

In piu, l'errore del grafico Recharts ("width(-1) and height(-1)") e causato dal rendering del chart prima che il container abbia dimensioni valide.

## Soluzione

### 1. Rimuovere la race condition nel flusso auth

Cambiare la strategia in `AuthContext.tsx`:
- `initSession()` chiama `getSession()` e salva la sessione, ma **non** chiama `handleAuthSession`
- Lasciare che sia `onAuthStateChange(INITIAL_SESSION)` l'unico entry point per caricare il contesto
- Questo elimina la doppia chiamata RPC

### 2. Aggiungere retry automatico con backoff

Se la prima chiamata RPC fallisce (timeout o errore di rete):
- Ritentare automaticamente fino a 2 volte con delay crescente (2s, 4s)
- Aumentare il timeout iniziale a 15 secondi
- Mostrare lo stato "loading" durante i retry, non l'errore

### 3. Fix grafico Recharts

Aggiungere `minWidth` e `minHeight` ai `ResponsiveContainer` nel `GuestSummaryWidget` e `Dashboard` per evitare il warning di dimensioni negative.

## Dettagli tecnici

### File modificati

| File | Modifica |
|------|----------|
| `src/contexts/AuthContext.tsx` | Rimuovere race condition, aggiungere retry con backoff, aumentare timeout |
| `src/components/dashboard/GuestSummaryWidget.tsx` | Aggiungere `minWidth`/`minHeight` a ResponsiveContainer |

### Logica AuthContext rivista

```text
initSession():
  getSession() -> se c'e sessione, NON chiamare handleAuthSession
  (onAuthStateChange gestira INITIAL_SESSION)

onAuthStateChange:
  SIGNED_IN / INITIAL_SESSION -> handleAuthSession(session)
  SIGNED_OUT -> reset
  TOKEN_REFRESHED -> aggiorna solo session

handleAuthSession(session):
  se stesso user gia processato -> skip
  loadUserContext() con retry (max 2 tentativi, backoff 2s/4s)
  timeout: 15 secondi
```

### Retry logic

```text
loadUserContext():
  per tentativo in [1, 2, 3]:
    prova RPC con timeout 15s
    se successo -> return weddings
    se fallisce e tentativo < 3:
      attendi 2^tentativo secondi
      log warning "Retry tentativo N..."
  se tutti falliti -> throw errore
```

Risultato atteso: il caricamento post-login passera da ~10-12 secondi a circa 1-2 secondi nella maggior parte dei casi.

