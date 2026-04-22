

# Pricing per Coppia + Pricing per Wedding Planner

## Obiettivo
Trasformare il modello pricing da "1 abbonamento per utente singolo" a:
1. **Coppia**: 49€/anno copre **entrambi gli sposi** (1 wedding) — chi paga sblocca anche il/la partner via email
2. **Wedding Planner**: pricing scalato per numero di matrimoni gestiti contemporaneamente

---

## 1. Modello Coppia (49€/anno per matrimonio)

**Logica:** L'abbonamento è legato al **wedding**, non all'utente. Già è così oggi (`weddings.subscription_status`). Quindi quando uno sposo paga, **tutti gli utenti con `user_role` su quel wedding ottengono accesso Premium automaticamente**.

**Cosa cambia:**
- **Limite "1 wedding per coppia"**: chi ha pagato 49€ può creare/possedere **un solo matrimonio attivo**. Se prova a creare un secondo wedding come `co_planner`, viene bloccato (eccezione: planner che gestisce wedding altrui).
- **Email di benvenuto al partner**: dopo il pagamento, identifichiamo il/la partner (l'altro `co_planner` sul wedding, oppure invitiamo via email se non ancora registrato/a) e inviamo "Filippo ha sbloccato WedsApp Premium anche per te — un anno completo, foto incluse".
- **Nessun cambio prezzo**: resta 49€/anno tramite il prodotto Stripe `premium_yearly` esistente.

---

## 2. Modello Wedding Planner (pricing per slot matrimonio)

**Logica:** Un wedding planner gestisce N matrimoni contemporaneamente. Paga in base al numero di **slot attivi**. Un "matrimonio attivo" = wedding la cui `wedding_date` è nel futuro o entro 30 giorni nel passato (per il post-evento).

**Tier proposti** (da confermarti):

| Tier | Slot matrimoni attivi | Prezzo annuale | Prezzo per matrimonio |
|---|---|---|---|
| **Solo** | 1 matrimonio | 99€/anno | 99€ |
| **Studio** | fino a 5 matrimoni | 349€/anno | 70€ |
| **Agency** | fino a 15 matrimoni | 799€/anno | 53€ |
| **Enterprise** | illimitati | 1.499€/anno | – |

**Razionale prezzi:** un planner monetizza ogni matrimonio (commissione media 2.000-5.000€), quindi il costo strumento per evento è marginale. Il tier Solo è leggermente più caro della coppia (99€ vs 49€) perché include funzioni B2B (Cockpit, multi-wedding switcher, branding).

**Comportamento:**
- Un planner senza abbonamento attivo può creare al massimo **1 wedding di prova** (trial 14 giorni).
- Quando supera lo slot del piano, l'app blocca la creazione di nuovi wedding e propone upgrade.
- I matrimoni "archiviati" (data > 30 giorni nel passato) **non contano** verso lo slot.

---

## 3. Modifiche tecniche

### 3.1 Database (migration)
- Aggiungere a `weddings`: `partner_unlocked_email TEXT NULL`, `partner_unlocked_at TIMESTAMPTZ NULL` (per logging email partner).
- Nuova tabella `planner_subscriptions`:
  - `id`, `user_id` (planner), `tier` (`solo|studio|agency|enterprise`), `slot_limit INT`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`, `trial_ends_at`.
  - RLS: planner vede solo la propria riga.
- Nuova RPC `count_active_planner_weddings(user_id)`: conta wedding dove l'utente ha `role='planner'` o `'co_planner'` con `wedding_date >= now() - 30 days`.

### 3.2 Prodotti Stripe (da creare)
Tramite `payments--batch_create_product`:
- `planner_solo` — 99€/anno
- `planner_studio` — 349€/anno
- `planner_agency` — 799€/anno
- `planner_enterprise` — 1499€/anno

(Il prodotto `premium_yearly` 49€ resta invariato.)

### 3.3 Edge Functions
- **Nuova `create-planner-checkout`**: come `create-checkout` ma usa i price ID planner e salva `stripe_subscription_id` su `planner_subscriptions`.
- **Aggiornata `payments-webhook`**: quando arriva `checkout.session.completed` per un prodotto **coppia**, esegue il flusso "unlock partner" (vedi 3.4). Quando arriva per un prodotto **planner**, popola `planner_subscriptions`.
- **Nuova `notify-partner-unlock`**: invocata dal webhook coppia. Trova l'altro `co_planner` sul wedding (o partner inserito durante onboarding tramite email), invia mail tramite il sistema email esistente con template "Il/La tua/o partner ha sbloccato WedsApp Premium per te".

### 3.4 Logica "Unlock Partner" (flusso)
1. Sposo A paga → webhook `checkout.session.completed`.
2. Webhook setta `weddings.subscription_status='active'` (già fatto oggi).
3. Webhook cerca un secondo `co_planner` sul wedding via `user_roles`. Se esiste → invia mail "WedsApp Premium attivato per te da [Nome A]".
4. Se non esiste secondo `co_planner` ma c'è `partner2_name` + email salvata: invia invito via `wedding_invitations` con ruolo `co_planner` + mail di benvenuto Premium.
5. Salva `partner_unlocked_email` + `partner_unlocked_at` su `weddings`.
6. Il partner B accede senza pagare nulla (l'accesso è già garantito perché ha `user_role` sullo stesso wedding e `useSubscription` legge da `weddings`).

### 3.5 Hook & Guards
- **`useSubscription`** (già esistente): nessun cambio per la coppia.
- **Nuovo `usePlannerSubscription`**: legge da `planner_subscriptions`, espone `slotLimit`, `slotsUsed`, `slotsAvailable`, `isReadOnly`.
- **Guard creazione wedding**:
  - Se utente è `co_planner` su un wedding già esistente → blocca creazione nuovo wedding (toast: "Il piano Coppia copre 1 matrimonio. Per gestirne altri, passa al piano Planner.").
  - Se utente è planner: confronta `count_active_planner_weddings()` con `slot_limit`. Se pieno → modal upgrade.

### 3.6 UI
- **Pagina `/app/upgrade`**: aggiungere sezione "Sei un wedding planner?" con link a `/app/upgrade/planner`.
- **Nuova pagina `/app/upgrade/planner`**: 4 card tier con CTA checkout.
- **Settings → Abbonamento**: per planner mostra "Slot usati: X/Y" + lista wedding attivi.
- **Email template**: nuovo template `partner-unlock.tsx` in `_shared/email-templates/`.

---

## 4. Domande da confermare prima dell'implementazione

1. **Prezzi planner**: ti vanno bene 99/349/799/1499€? Vuoi modificarli?
2. **Definizione "matrimonio attivo"**: confermi 30 giorni post-evento prima di archiviazione automatica?
3. **Trial planner**: 14 giorni va bene, o preferisci 30 come per la coppia?
4. **Partner senza email**: se il partner B non ha email registrata, mostriamo nel post-checkout uno step "Invita il/la tuo/a partner" con campo email obbligatorio?

---

## 5. Test plan (post-implementazione)

**Coppia:**
1. Registra sposo A → onboarding wedding → upgrade 49€ con carta `4242 4242 4242 4242`.
2. Verifica `weddings.subscription_status='active'` e che la mail al partner sia in `email_send_log`.
3. Registra sposa B con stessa email salvata → accetta invito → verifica accesso Premium senza pagamento.
4. Tenta di creare un secondo wedding come sposo A → deve essere bloccato.

**Planner:**
1. Registra planner → flow onboarding "planner" → atterra su `/app/upgrade/planner`.
2. Acquista tier Studio (5 slot) con `4242 4242 4242 4242`.
3. Verifica `planner_subscriptions.slot_limit=5`.
4. Crea 5 wedding → tenta il sesto → deve mostrare modal upgrade ad Agency.
5. Archivia 1 wedding (sposta data nel passato > 30gg) → verifica che lo slot si liberi.

**Test card decline:** `4000 0000 0000 0002` per testare gestione errori.

