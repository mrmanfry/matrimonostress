

# Ristrutturazione Pagamenti: Premium + Memories + Sconti

## Obiettivo
Ripensare l'infrastruttura pagamenti con un'integrazione pulita basata su **Lovable Payments (Stripe gestito)**, mantenendo i prezzi attuali (49€/anno per Premium, 3 tier una tantum per Memories) e abilitando un campo **codice sconto** in checkout.

---

## 1. Migrazione a Lovable Payments

**Cosa cambia:**
- Disconnetti il Stripe di test attualmente collegato (lo fai tu dal dashboard Payments).
- Abilitiamo Lovable Payments che gestisce automaticamente la chiave Stripe in ambiente test e live.
- Ricreiamo i 4 prodotti su Stripe con nuovi `price_id`:
  - **Premium**: 49€/anno (subscription)
  - **Memories Starter**: 9€ una tantum / 500 foto
  - **Memories Plus**: 29€ una tantum / 1.500 foto
  - **Memories Premium**: 49€ una tantum / 2.500 foto

**Cosa NON cambia:**
- Il flusso utente (trial 30 giorni → paywall → checkout) resta identico.
- I dati esistenti (`weddings.subscription_status`, `trial_ends_at`, `unlocked_photo_limit`) restano intatti.

---

## 2. Codici Sconto al Checkout

**Approccio**: campo nativo di Stripe Checkout (zero codice da mantenere).

- Aggiungiamo `allow_promotion_codes: true` nelle 2 edge function (`create-checkout`, `unlock-photos`).
- Tu crei i codici dal **dashboard Stripe** (Stripe Coupons + Promotion Codes) con la flessibilità totale:
  - **Coupon "FAMIGLIA100"** → 100% sconto, una sola volta → checkout gratis (Stripe completa la sessione a 0€ e attiva comunque l'abbonamento).
  - **Coupon "AMICO50"** → 50% sconto.
  - **Coupon "BETA"** → fisso 20€ di sconto, scadenza 31/12.
- L'utente vede il campo "Hai un codice promo?" direttamente nella pagina di pagamento Stripe.

**Risultato**: copre i casi "non pagare" e "sconto" senza nuove tabelle, senza UI custom, e i codici sono gestibili in autonomia da te.

---

## 3. Pulizie e Miglioramenti

- **Trial reminder**: già attivi a 5gg e 2gg dalla scadenza (cron `check-trial-reminders`), li lasciamo invariati.
- **Customer Portal Stripe**: già attivo per gestire/cancellare l'abbonamento dalle Impostazioni.
- **Webhook opzionale (consigliato)**: oggi lo stato si aggiorna via polling di `check-subscription` dopo il redirect. Questo crea due fragilità:
  - Se l'utente chiude la pagina prima del redirect, lo stato non si aggiorna finché non rientra.
  - Se Stripe disdice/rinnova un abbonamento, l'app non lo sa fino al prossimo login.
  
  Aggiungiamo una edge function **`stripe-webhook`** che ascolta gli eventi `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.paid`. Aggiorna in modo affidabile `weddings.subscription_status` e `current_period_end`.

---

## Cosa Vedrà l'Utente

```text
┌──────────────────────────────────────────┐
│  Pagina Upgrade (49€/anno)               │
│  [ Paga in sicurezza con Stripe ] ──────┐│
└──────────────────────────────────────────┘│
                                            ▼
┌──────────────────────────────────────────┐
│  Stripe Checkout                         │
│  • Email                                 │
│  • Carta                                 │
│  • [+ Aggiungi codice promozionale] ←── │  ← NEW
│  Totale: 49€  →  con codice: 0€/24,50€  │
└──────────────────────────────────────────┘
```

Identico per le 3 card Memories nel dialog di upgrade foto.

---

## Dettagli Tecnici

**Nuovi/aggiornati edge function:**
- `create-checkout` → aggiungi `allow_promotion_codes: true`, sostituisci `PREMIUM_PRICE_ID` con quello nuovo.
- `unlock-photos` → aggiungi `allow_promotion_codes: true`, sostituisci i 3 `price_id` nei `TIERS`.
- `stripe-webhook` (nuovo) → endpoint pubblico (`verify_jwt = false`), valida firma con `STRIPE_WEBHOOK_SECRET`, aggiorna tabella `weddings`. URL da incollare nel dashboard Stripe.

**Frontend:**
- Nessuna modifica a `Upgrade.tsx`, `UpgradePhotosDialog.tsx`, `useSubscription.ts`. Tutto il resto è dietro le quinte.

**Database:**
- Nessuna nuova tabella. Le colonne esistenti (`stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `current_period_end`) coprono già tutto.

---

## Cosa Devi Fare Tu

1. **Adesso (manuale):** apri il dashboard Payments e disconnetti il Stripe di test attuale.
2. **Dopo l'approvazione del piano:** confermi e io abilito Lovable Payments + creo i 4 prodotti + aggiorno le edge function + aggiungo il webhook.
3. **Una volta pronto:** dal dashboard Stripe (test) crei i tuoi primi codici sconto (es. `BETA100` per accessi gratuiti) e li condividi con chi vuoi.

<lov-actions>
<lov-open-payments>Apri dashboard Pagamenti</lov-open-payments>
</lov-actions>

