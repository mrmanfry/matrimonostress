

# Planner: Atterraggio sul Cockpit dopo il Login

## Problema

Quando un planner fa login, il routing lo porta a `/app/dashboard` (dentro un matrimonio specifico). Questo è sbagliato perché la centralità per un planner è il Cockpit, non un singolo matrimonio.

I punti da correggere sono **due**:

1. **Route index di `/app`** in `src/App.tsx` (riga 73): `<Route index element={<Navigate to="/app/dashboard" replace />} />` — porta sempre a dashboard indipendentemente dal ruolo.

2. **Redirect post-onboarding** in `src/guards/ProtectedRoute.tsx` (riga 120-125): quando `redirectIfHasWedding` è true, il redirect usa `activeMode` ma l'onboarding `/onboarding` usa questo guard — già corretto qui.

## Piano

### 1. Route index condizionale (`src/App.tsx`)

Sostituire il `<Navigate to="/app/dashboard">` statico con un componente che legge `activeMode` dal contesto e redirige di conseguenza:

```text
/app → activeMode === 'planner' ? /app/planner : /app/dashboard
```

Creare un piccolo componente `AppIndexRedirect` inline che usa `useAuth()` per decidere.

### 2. Redirect post-login in ProtectedRoute (`src/guards/ProtectedRoute.tsx`)

Già gestito correttamente alla riga 124: `const target = activeMode === 'planner' ? '/app/planner' : '/app/dashboard'`. Nessuna modifica necessaria.

## File da Modificare

| File | Modifica |
|------|----------|
| `src/App.tsx` | Sostituire `<Navigate to="/app/dashboard">` con redirect condizionale basato su `activeMode` |

