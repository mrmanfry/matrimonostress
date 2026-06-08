# Fix login Google: redirect post-OAuth

## Problema

In `/auth`, cliccando "Accedi con Google" il flusso OAuth ritorna su `https://.../` (la landing) con un `#` finale. L'utente non viene loggato visivamente, deve ricliccare "Accedi" per arrivare alla dashboard.

## Causa

In `src/pages/Auth.tsx` (riga 82) il redirect è impostato su:

```ts
redirect_uri: window.location.origin
```

Quindi al ritorno dall'OAuth Google atterra su `/` (pagina `Index`, la landing). La landing non controlla se l'utente è autenticato e non redirige a `/app/dashboard`. L'auto-redirect è gestito solo dal listener in `Auth.tsx` (righe 58-69), che però agisce solo se `pathname === "/auth"`.

Risultato: la sessione viene effettivamente creata, ma l'utente resta sulla landing finché non clicca di nuovo "Accedi" (che lo porta su `/auth`, dove il listener finalmente lo manda in dashboard).

## Soluzione

Cambiare il `redirect_uri` per tornare su `/auth`, così il listener `onAuthStateChange` già esistente scatta e porta l'utente direttamente a `/app/dashboard`.

### File modificato

**`src/pages/Auth.tsx`** (riga 81-83)
```ts
const { error } = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: `${window.location.origin}/auth`,
});
```

Nessuna altra modifica necessaria: il listener esistente in `useEffect` gestisce già il navigate verso `/app/dashboard` (e `ProtectedRoute` poi inoltra a `/onboarding` se manca il wedding).

## Note

- Nessuna modifica a logica di business, DB o configurazione OAuth lato Cloud.
- L'URL `/auth` è già nella allowlist Lovable (essendo sullo stesso origin).
