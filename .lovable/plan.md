

# Fix: "Apri progetto" non funziona in modalita Planner

## Problema

In `AppLayout.tsx` c'e un `useEffect` che fa redirect automatico:

```
if (activeMode === 'planner' && location.pathname === '/app/dashboard') {
  navigate('/app/planner', { replace: true });
}
```

Quando il planner clicca "Apri progetto":
1. `switchWedding(weddingId)` aggiorna lo state
2. `navigate("/app/dashboard")` porta alla dashboard
3. Il `useEffect` vede `activeMode === 'planner'` + rotta `/app/dashboard` e fa redirect a `/app/planner`

Risultato: il planner torna al cockpit, sembra che non succeda nulla.

## Soluzione

Rimuovere il redirect automatico da `AppLayout`. Il redirect era pensato per il caso "planner atterra su /app/dashboard al primo login", ma quel caso e gia gestito da `ProtectedRoute` che fa il redirect iniziale basato su `activeMode`.

Il `useEffect` in `AppLayout.tsx` (righe ~100-104) va eliminato completamente. Il routing intelligente post-login e gia coperto da `ProtectedRoute.tsx`.

## File da modificare

| File | Modifica |
|------|----------|
| `src/pages/AppLayout.tsx` | Rimuovere il `useEffect` che fa redirect `/app/dashboard` -> `/app/planner` |

Nessun altro file coinvolto. Fix singolo e chirurgico.

