## Problema

Confermando le presenze da RSVP l'edge function `rsvp-handler` risponde `403 { error: "RSVP deadline passed" }` e il client mostra l'errore.

Causa individuata dai log + query DB: nel matrimonio Ludovica & Filippo il campo **legacy** `weddings.rsvp_config.deadline_date` vale `2026-06-30` (già passata), mentre la scadenza reale, salvata dal nuovo editor in `weddings.campaigns_config.rsvp.deadline_date`, è `2026-07-15` (futura).

L'action `fetch` dell'edge function legge già la deadline con la logica corretta (prima `campaigns_config.rsvp.deadline_date`, poi fallback legacy), quindi il client vede `isReadOnly=false` e permette il submit. Ma il ramo **submit** (righe 496–509 di `supabase/functions/rsvp-handler/index.ts`) legge SOLO il legacy `rsvp_config.deadline_date` e blocca la richiesta.

## Fix

Allineare la logica di deadline del submit a quella del fetch.

### `supabase/functions/rsvp-handler/index.ts` (ramo submit)

Sostituire il blocco che legge solo `rsvp_config`:

```ts
const { data: wedding } = await supabase
  .from("weddings")
  .select("rsvp_config")
  .eq("id", validGuest.wedding_id)
  .single();

const rsvpConfig = wedding?.rsvp_config as RSVPConfig | null;
if (rsvpConfig?.deadline_date && new Date(rsvpConfig.deadline_date) < new Date()) { ... }
```

con:

```ts
const { data: wedding } = await supabase
  .from("weddings")
  .select("rsvp_config, campaigns_config")
  .eq("id", validGuest.wedding_id)
  .single();

const campaignsConfig = wedding?.campaigns_config as CampaignsConfig | null;
const legacyConfig = wedding?.rsvp_config as RSVPConfig | null;
const effectiveDeadline =
  campaignsConfig?.rsvp?.deadline_date ?? legacyConfig?.deadline_date ?? null;

if (effectiveDeadline && new Date(effectiveDeadline) < new Date()) {
  return new Response(JSON.stringify({ error: "RSVP deadline passed" }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

Nessun'altra modifica necessaria: il fetch resta com'è, il client resta com'è. Dopo il deploy la conferma presenze funzionerà per tutti i matrimoni che hanno migrato la deadline al nuovo `campaigns_config`, anche se il vecchio `rsvp_config.deadline_date` è rimasto valorizzato con una data passata.

## Verifica

1. Dal preview, aprire il link RSVP di Ludovica & Filippo, confermare una presenza → deve rispondere `200` e mostrare il toast di successo.
2. Controllare i log di `rsvp-handler`: la POST successiva deve essere `200`, non più `403`.
