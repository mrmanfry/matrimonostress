

# Fix: Eliminare timeout artificiale e deduplicare eventi auth

## Problema reale

L'RPC `get_user_context` funziona sempre -- ma sul cold start di PostgREST impiega 20-30 secondi. Il timeout artificiale di 15s causa un errore falso, e i 3 retry significano fino a 45 secondi di attesa prima che `INITIAL_SESSION` finalmente riesca.

Flusso attuale (rotto):
```text
SIGNED_IN -> handleAuthSession -> RPC timeout 15s -> retry 1 (15s) -> retry 2 (15s) -> ERRORE
INITIAL_SESSION -> handleAuthSession -> RPC successo immediato (perche PostgREST e ora caldo)
```

## Soluzione

### 1. Rimuovere il timeout artificiale

Il timeout e controproducente: la query funziona sempre, serve solo pazienza sul cold start. Senza timeout, l'utente vedra lo stato "loading" per 20-30s al primo accesso (cold start), ma non vedra MAI un errore falso.

### 2. Rimuovere i retry

Se non c'e timeout, non servono retry. L'RPC o risponde (anche se lentamente) o fallisce per errore reale (network down). In caso di errore reale, mostriamo la UI di errore con "Riprova".

### 3. Gestire solo INITIAL_SESSION (ignorare SIGNED_IN al primo caricamento)

Su page load, Supabase emette sia `SIGNED_IN` che `INITIAL_SESSION`. Basta gestire `INITIAL_SESSION` per il caricamento iniziale. `SIGNED_IN` viene gestito solo se non c'e gia un caricamento in corso (cioe durante un login attivo nella stessa sessione).

## Dettagli tecnici

### File: `src/contexts/AuthContext.tsx`

**loadUserContext** -- semplificato:
```text
const loadUserContext = async (): Promise<WeddingContext[]> => {
  const { data, error } = await supabase.rpc('get_user_context');
  if (error) throw error;
  return parseWeddingsFromRpc(data);
};
```

Niente timeout, niente retry, niente Promise.race. La chiamata Supabase ha il suo timeout interno HTTP (60s default).

**onAuthStateChange** -- deduplicazione migliorata:
```text
if (event === 'SIGNED_IN') {
  // Su SIGNED_IN, avvia SOLO se non c'e gia un caricamento
  // e l'utente non e gia stato processato
  if (!isLoadingContext.current && lastProcessedUserId.current !== session.user.id) {
    await handleAuthSession(session);
  }
}
if (event === 'INITIAL_SESSION') {
  // INITIAL_SESSION e il segnale definitivo: avvia sempre
  // (a meno che non sia gia in corso)
  if (!isLoadingContext.current) {
    await handleAuthSession(session);
  }
}
```

### Risultato atteso

| Scenario | Prima | Dopo |
|----------|-------|------|
| Cold start (primo accesso del giorno) | 45s + errore + caricamento | 20-30s loading, poi dashboard |
| Warm start (accessi successivi) | 15s timeout + retry + caricamento | 1-2s loading, poi dashboard |
| Navigazione interna | Immediato | Immediato |

L'import di `retryWithBackoff` verra rimosso dato che non serve piu in questo file.

