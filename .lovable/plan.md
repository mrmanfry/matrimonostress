

# Fix: Auth bloccato su "Caricamento..." -- Race Condition + Timeout mancante

## Problema

Due bug si sommano causando il blocco infinito:

1. **Race condition**: React StrictMode monta il componente due volte. Entrambe le sottoscrizioni `onAuthStateChange` ricevono `SIGNED_IN` e entrambe avviano la chiamata RPC prima che il guard (`isLoadingContext.current`) venga attivato dal primo.

2. **Nessun timeout**: Dopo la rimozione del timeout nel fix precedente, se PostgREST e in cold start, la chiamata RPC resta appesa per un tempo indefinito senza dare alcun feedback all'utente.

```text
Mount 1: SIGNED_IN -> check guard (false) -> handleAuthSession -> RPC...
Mount 2: SIGNED_IN -> check guard (false) -> handleAuthSession -> RPC...
                                                          (entrambi appesi)
```

## Soluzione

### File: `src/contexts/AuthContext.tsx`

#### 1. Rendere il guard sincrono e atomico

Spostare il settaggio di `isLoadingContext.current = true` PRIMA dell'await, e usare un pattern "lock" sincrono: chi arriva per primo lo imposta, chi arriva per secondo esce immediatamente.

```text
// Nel callback onAuthStateChange, PRIMA di chiamare handleAuthSession:
if (isLoadingContext.current) return;  // lock sincrono
isLoadingContext.current = true;
try {
  await handleAuthSession(session);
} finally {
  isLoadingContext.current = false;
}
```

Questo sposta il lock FUORI da handleAuthSession e nel callback stesso, garantendo che solo un evento alla volta possa avviare il processo.

#### 2. Ignorare SIGNED_IN durante il caricamento iniziale

`SIGNED_IN` su page load e ridondante con `INITIAL_SESSION`. Lo gestiamo solo se l'utente ha appena fatto login nella stessa sessione (cioe lo stato corrente NON e "loading"):

```text
if (event === 'SIGNED_IN') {
  // Solo se non siamo nel caricamento iniziale
  if (authState corrente non e "loading") {
    avvia handleAuthSession
  }
}
if (event === 'INITIAL_SESSION') {
  // Questo e il segnale definitivo per il primo caricamento
  avvia handleAuthSession
}
```

#### 3. Aggiungere timeout ragionevole (45s) con fallback alla UI di errore

Un timeout di 45 secondi (sufficiente per il cold start piu lento) con fallback alla schermata "authenticated_wedding_error" che ha gia il pulsante "Riprova":

```text
const loadUserContext = async (): Promise<WeddingContext[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  
  try {
    const { data, error } = await supabase.rpc('get_user_context', {}, {
      signal: controller.signal
    });
    // ...
  } finally {
    clearTimeout(timeout);
  }
};
```

Se `supabase.rpc` non supporta `signal`, usiamo un `Promise.race` con un reject dopo 45s.

#### 4. Rimuovere il guard duplicato da handleAuthSession

Dato che il lock e ora gestito dal callback, `handleAuthSession` non ha piu bisogno del check `isLoadingContext.current`. Resta solo il check `lastProcessedUserId` come ottimizzazione:

```text
const handleAuthSession = async (session: Session) => {
  if (lastProcessedUserId.current === session.user.id) {
    return; // gia processato
  }
  // ... resto della logica
};
```

## Risultato atteso

| Scenario | Prima | Dopo |
|----------|-------|------|
| Cold start | Appeso infinitamente | Max 45s loading, poi "Riprova" |
| Warm start | Due RPC parallele, ~2s | Una sola RPC, ~1-2s |
| StrictMode | Due chiamate concorrenti | Una sola chiamata (lock sincrono) |
| Login nella sessione | Funziona | Funziona (SIGNED_IN gestito) |

## File modificati

| File | Modifica |
|------|----------|
| `src/contexts/AuthContext.tsx` | Lock sincrono nel callback, timeout 45s, ignora SIGNED_IN durante loading iniziale |

