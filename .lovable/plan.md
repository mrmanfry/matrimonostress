

## Piano: Fix immagini Cerimonia/Ricevimento nel preview RSVP

### Problema
In `src/components/rsvp/FormalInviteView.tsx` (righe 357 e 413) le immagini di Cerimonia e Ricevimento usano:

```tsx
className="w-full max-w-md h-40 object-cover rounded-lg"
```

- `h-40` = altezza fissa di 160px
- `object-cover` = riempie il box ritagliando ciò che eccede

Risultato: con illustrazioni acquerello (come quella allegata, formato panoramico ~3:1) o con foto verticali, parti importanti del soggetto vengono **tagliate** in alto/basso o ai lati.

### Soluzione
Sostituire l'altezza fissa con un **aspect ratio ragionevole** e cambiare strategia in base al contenuto:

**Opzione scelta**: `aspect-[16/10]` + `object-cover` con `object-center`, ma con altezza più generosa e `max-h` per evitare immagini troppo alte. Questo è il compromesso migliore perché:
- Mostra meglio sia foto orizzontali (location reali) che illustrazioni acquerello
- Mantiene un layout consistente tra Cerimonia e Ricevimento
- Non rompe il design quando l'utente carica un'immagine quadrata o verticale

Modifica concreta su entrambe le immagini:

```tsx
// Prima
className="w-full max-w-md h-40 object-cover rounded-lg"

// Dopo
className="w-full max-w-md aspect-[16/10] object-cover object-center rounded-lg"
```

In alternativa, se l'utente preferisce **vedere l'immagine intera senza tagli** (più adatto per illustrazioni acquerello), userei `object-contain` con un background neutro:

```tsx
className="w-full max-w-md max-h-64 object-contain rounded-lg bg-stone-50"
```

### File toccati
| File | Modifica |
|------|----------|
| `src/components/rsvp/FormalInviteView.tsx` | Righe 357 + 413: sostituire `h-40 object-cover` con `aspect-[16/10] object-cover object-center` |

### Cosa NON tocco
- Logica del componente, props, dati
- `SaveTheDateView.tsx` (verifico se ha lo stesso problema durante l'implementazione e applico lo stesso fix se serve)
- Altre sezioni del RSVP (hero, countdown, FAQ, ecc.)

### Domanda prima di procedere
Quale comportamento preferisci per le immagini?

1. **Crop intelligente** (`aspect-[16/10] object-cover`) — l'immagine riempie sempre il box mantenendo proporzioni, ma può tagliare i bordi su immagini molto verticali. Layout sempre uniforme.
2. **Immagine intera** (`max-h-64 object-contain` + sfondo neutro) — mostra sempre tutta l'immagine senza tagli, ma può lasciare bande laterali su immagini molto larghe.

Se non rispondi, vado con l'**opzione 1** (più moderna, layout uniforme, è lo standard per inviti digitali tipo Zola/The Knot).

