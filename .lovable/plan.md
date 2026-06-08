## Diagnosi

Sul sito pubblicato `https://wedsapp.it` la console mostra:

- `index-DWY2mOel.js` → **404 Not Found**
- `index-BPYvqYe0.css` → servito con MIME `text/plain` (rifiutato dal browser)
- `wedsapp-logo-horizontal.svg` → 404

L'`index.html` deployato sta richiedendo file con hash che **non esistono più** sul CDN. Questo è il classico sintomo di un deploy parzialmente fallito o disallineato: l'HTML è di una build, gli asset di un'altra (o non sono stati caricati).

Il preview Lovable funziona perché serve sempre l'ultima build dal sandbox; solo il dominio pubblicato è rotto.

## Piano

1. **Re-publish** del progetto dal pannello Lovable (oppure tramite il pulsante "Publish" in alto a destra). Questo rigenera `index.html` + asset hash coerenti e li ricarica sul CDN del dominio custom `wedsapp.it`.
2. Dopo il deploy (~1 minuto), hard-refresh del browser (Cmd/Ctrl+Shift+R) per scaricare il nuovo `index.html` invece di quello in cache.
3. Verificare in console che non ci siano più 404 sugli asset.

## Se il problema persiste dopo il re-publish

- Controllare in **Project Settings → Domains** che `wedsapp.it` sia in stato **Active** (non Offline/Failed).
- Verificare che le variabili `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` non siano state svuotate (causa build rotta senza errori visibili).
- Eventualmente disconnettere e riconnettere il dominio custom.

## Note

Nessuna modifica al codice è necessaria: il codice è OK (il preview gira), è il deploy del dominio custom ad essere disallineato. Confermami e procedo a ripubblicare.