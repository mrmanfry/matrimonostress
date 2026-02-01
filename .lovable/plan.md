

## Piano: Allineare la Logica "Draft Count" tra FunnelKPICards e GuestAnalytics

### Problema
Due componenti mostrano numeri diversi per "Da Lavorare":
- **FunnelKPICards**: 4 ospiti (usa logica nucleus-aware)  
- **GuestAnalyticsDashboard**: 16 ospiti (ignora logica party)

La differenza di 12 ospiti sono membri di party senza telefono che vengono considerati "contattati" tramite il referente del party in `FunnelKPICards`, ma non in `guestAnalytics.ts`.

### Soluzione
Modificare `calculateGuestAnalytics()` in `src/lib/guestAnalytics.ts` per usare la stessa logica nucleus-aware di `FunnelKPICards.tsx`, importando e utilizzando `getEffectiveStatus()`.

### Modifiche Tecniche

**File: `src/lib/guestAnalytics.ts`**

1. Importare `getEffectiveStatus`:
```typescript
import { getEffectiveStatus } from "@/lib/nucleusStatusHelper";
```

2. Modificare il calcolo del funnel (linee 177-187):
```typescript
// Campaign funnel - usa logica nucleus-aware
const draftCount = regularGuests.filter(g => {
  const status = getEffectiveStatus(g, guests);
  return !status.hasStdSent && !status.hasFormalInvite;
}).length;

const stdSentCount = regularGuests.filter(g => {
  const status = getEffectiveStatus(g, guests);
  return status.hasStdSent && !status.hasFormalInvite;
}).length;

const invitedCount = regularGuests.filter(g => {
  const status = getEffectiveStatus(g, guests);
  return status.hasFormalInvite;
}).length;

// STD responses rimangono sul singolo ospite (chi ha risposto)
const stdRespondedCount = regularGuests.filter(g => g.std_response).length;
const stdResponseRate = stdSentCount > 0 ? (stdRespondedCount / stdSentCount) * 100 : 0;
```

### Risultato Atteso
Dopo la modifica:
- `FunnelKPICards` e `GuestAnalyticsDashboard` mostreranno lo stesso numero per "Da Lavorare"
- Gli ospiti senza telefono in party già contattati non saranno più contati come "draft"
- Unica fonte di verità per i calcoli funnel

### Considerazioni
- L'interfaccia `GuestForAnalytics` include già i campi necessari (`party_id`, `phone`, `save_the_date_sent_at`, `formal_invite_sent_at`)
- `getEffectiveStatus` accetta generici, quindi funzionerà con `GuestForAnalytics[]`

