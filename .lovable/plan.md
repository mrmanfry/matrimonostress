

# Piano: Nuovo Pricing Model — Scaglioni Foto

## Modello attuale vs nuovo

**Attuale**: boolean `photos_unlocked`, singolo pagamento €15, 100 foto gratis → sblocca tutto.

**Nuovo**: 150 foto gratis, 3 scaglioni acquistabili:
| Tier | Foto visibili | Prezzo |
|------|--------------|--------|
| Base (gratis) | 150 | €0 |
| Starter | 500 | €9 |
| Plus | 1.500 | €29 |
| Premium | 2.500 | €49 |

Gli sposi possono upgradare in qualsiasi momento (prima o dopo l'evento). Vedono solo le foto fino al tier acquistato. Gli ospiti scattano sempre fino al `hard_storage_limit` (2500).

## Modifiche database

### Migration SQL
- Rimuovere `photos_unlocked` (boolean) — non serve più
- Aggiungere `unlocked_photo_limit` (integer, default 150) — quante foto possono vedere
- Aggiornare `free_reveal_limit` default da 100 a 150
- Aggiornare `hard_storage_limit` default da 2000 a 2500
- Aggiornare record esistenti

```sql
ALTER TABLE disposable_cameras ADD COLUMN unlocked_photo_limit integer NOT NULL DEFAULT 150;
ALTER TABLE disposable_cameras ALTER COLUMN free_reveal_limit SET DEFAULT 150;
ALTER TABLE disposable_cameras ALTER COLUMN hard_storage_limit SET DEFAULT 2500;
UPDATE disposable_cameras SET free_reveal_limit = 150, hard_storage_limit = 2500, unlocked_photo_limit = 150;
-- Migrate existing unlocked cameras: they had unlimited access
UPDATE disposable_cameras SET unlocked_photo_limit = 2500 WHERE photos_unlocked = true;
ALTER TABLE disposable_cameras DROP COLUMN photos_unlocked;
```

### Stripe — 3 nuovi prodotti/prezzi
Creare via Stripe tools:
- **Memories Starter** (500 foto) — €9 one-time
- **Memories Plus** (1500 foto) — €29 one-time
- **Memories Premium** (2500 foto) — €49 one-time

## Edge Functions

### `unlock-photos/index.ts` — Riscrivere
- Riceve `{ weddingId, tier: "starter"|"plus"|"premium" }`
- Mappa tier → price_id e foto_limit
- Crea Checkout Session con metadata `{ weddingId, type: "memories_unlock", tier, photo_limit }`

### `verify-photo-unlock/index.ts` — Aggiornare
- Trova la sessione pagata per il weddingId
- Legge `photo_limit` dai metadata
- Aggiorna `unlocked_photo_limit` in `disposable_cameras` (prende il max tra quello attuale e quello nuovo, così non si downgradata)

## Frontend

### `MemoriesGallery.tsx`
- Sostituire logica `unlocked` boolean con `unlocked_photo_limit`
- Foto visibili = `approvedPhotos.slice(0, unlocked_photo_limit)`
- CTA: mostrare i 3 tier come card con prezzo, con evidenziazione del tier consigliato in base al numero di foto scattate
- Se già acquistato un tier, mostrare quale tier è attivo e opzione di upgrade

### `MemoriesKPIs.tsx`
- Aggiornare il KPI "Foto" per mostrare `{visibili} / {totali scattate}` 
- Se ci sono foto oltre il limite: badge "Upgrade per vedere tutte"

### `MemoriesReel.tsx`
- Rimuovere riferimenti a `photos_unlocked`
- Usare `unlocked_photo_limit` dal camera object

### `MemoriesSettings.tsx`
- Nessuna modifica (il limite non è editabile dagli sposi, si compra)

## File coinvolti
1. **Migration SQL** — nuova colonna, aggiorna defaults, drop `photos_unlocked`
2. **Stripe** — 3 nuovi prodotti con prezzi
3. **`supabase/functions/unlock-photos/index.ts`** — tier-based checkout
4. **`supabase/functions/verify-photo-unlock/index.ts`** — aggiorna `unlocked_photo_limit`
5. **`src/components/memories/MemoriesGallery.tsx`** — UI tier cards, logica visibilità
6. **`src/components/memories/MemoriesKPIs.tsx`** — KPI aggiornati
7. **`src/pages/MemoriesReel.tsx`** — rimuovere `photos_unlocked`

