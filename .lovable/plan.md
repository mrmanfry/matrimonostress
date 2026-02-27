

## Fix: Google Places API - Errore 403 "Referer blocked"

### Problema
L'errore `API_KEY_HTTP_REFERRER_BLOCKED` con `httpReferrer: "<empty>"` persiste perché la chiave API ha ancora il tipo di restrizione impostato su "HTTP referrers". Anche con la lista vuota, Google blocca le richieste senza header Referer.

### Soluzione (2 azioni parallele)

**Azione 1 - Google Cloud Console (da fare manualmente):**
1. Vai su [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Clicca sulla tua API Key
3. Nella sezione **"Application restrictions"** (Restrizioni applicazione), seleziona **"None"** invece di "HTTP referrers"
4. Salva. Le modifiche possono impiegare fino a 5 minuti per propagarsi.

**Azione 2 - Fix nel codice della Edge Function:**
Aggiornare `supabase/functions/places-autocomplete/index.ts` per inviare un header `Referer` nella chiamata a Google, in modo che funzioni anche con restrizioni HTTP referrer attive.

### Modifica tecnica

File: `supabase/functions/places-autocomplete/index.ts`

Nella chiamata `fetch` verso Google Places API, aggiungere l'header `Referer` con il dominio dell'applicazione:

```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'Referer': 'https://matrimonostress.lovable.app',
  },
  body: JSON.stringify(body),
});
```

Questo assicura che anche con restrizioni "HTTP referrers" attive sulla chiave, le richieste vengano accettate.

