

# Piano di Implementazione: Onboarding, Trial, Stripe e Gestione Profilo

## Analisi dello Stato Attuale vs Documento Funzionale

| Area | Stato Attuale | Gap |
|---|---|---|
| Auth (Sign-up/Login) | Funzionante con email/password, checkbox "Resta collegato" | Manca Google OAuth, layout split-screen, rimozione Nome/Cognome dal signup |
| Onboarding Wizard | Form unico con tutti i campi insieme | Manca wizard a step, ruolo utente, checkbox "data non decisa", rimozione budget |
| Trial 30 giorni | Non implementato | Tutto da fare: campi DB, badge header, countdown, read-only mode |
| Stripe Checkout | Non implementato | Tutto da fare: pagina /upgrade, edge function, checkout session |
| Stripe Webhooks | Non implementato | Tutto da fare: edge function stripe-webhook, sync DB |
| Stripe Customer Portal | Non implementato | Tutto da fare: edge function, tab Abbonamento in Settings |
| Settings / Profilo | Parzialmente fatto (tab Account, Matrimonio, Team, Comunicazioni) | Da ristrutturare tab, aggiungere Danger Zone, tab Abbonamento |
| Email lifecycle | Non implementato | CRON trial reminders, email benvenuto |

## Approccio: Implementazione in 4 Fasi

Data la complessita (6 capitoli, 20+ componenti), propongo di suddividere in 4 fasi ordinate per dipendenza e priorita. Ogni fase sara un prompt separato.

---

### FASE 1: Database + Auth Redesign + Onboarding Wizard
*Prerequisito per tutto il resto*

**1A. Migrazione Database**
Aggiungere alla tabella `weddings` i campi necessari per trial e Stripe:
- `subscription_status` (text, default `'trialing'`)
- `trial_ends_at` (timestamptz, default `now() + 30 days`)
- `stripe_customer_id` (text, nullable)
- `stripe_subscription_id` (text, nullable)
- `current_period_end` (timestamptz, nullable)
- `is_date_tentative` (boolean, default false)
- `user_role_type` (text, nullable) -- ruolo scelto dall'utente (Sposa, Sposo, Planner, Altro)

Aggiungere alla tabella `weddings` i campi per tracking email:
- `welcome_email_sent` (boolean, default false)
- `trial_reminder_5d_sent` (boolean, default false)
- `trial_reminder_2d_sent` (boolean, default false)

**1B. Redesign pagina Auth (/auth)**
- Layout split-screen desktop (immagine emozionale a sinistra, form a destra)
- Mobile: form full-screen, nessun header/footer
- Aggiungere bottone "Continua con Google" (OAuth via Lovable Cloud)
- Rimuovere i campi Nome/Cognome dal signup (verranno raccolti nell'onboarding)
- Mantenere toggle mostra/nascondi password e indicatore robustezza

**1C. Wizard Onboarding a Step (/onboarding)**
Trasformare il form unico attuale in un wizard a 2 step:

- **Step 1 - "Chi si sposa?"**: Nome Partner 1, Nome Partner 2, Select "Qual e il tuo ruolo?" (Sposa/Sposo/Wedding Planner/Altro)
- **Step 2 - "Quando?"**: Datepicker, Checkbox "Non abbiamo ancora una data precisa" (se spuntata: select Mese+Anno e flag `is_date_tentative = true`), Bottone "Entra nella Dashboard"

Rimuovere: campo Budget (troppo presto), campo Email Partner 2 (spostato nei Settings), tab "Ho un Codice" (spostato nella Dashboard come gia esiste).

Progress bar in alto ("Step 1 di 2").

**1D. Welcome State Dashboard**
Al primo accesso dopo onboarding:
- Toast di benvenuto: "Benvenuti! Il vostro account Premium e attivo gratis per i prossimi 30 giorni."
- Card "I tuoi prossimi passi" con azioni suggerite (Aggiungi invitati, Imposta budget, Invita il partner).

---

### FASE 2: Trial Management + Paywall + Read-Only Mode

**2A. Componente Trial Badge (Header)**
Componente persistente nell'header di `AppLayout`:
- Legge `subscription_status` e `trial_ends_at` dal DB
- Giorni > 5: Badge grigio "Trial: X giorni"
- Giorni 1-5: Badge arancione warning
- Scaduto: Badge rosso "Trial Terminato"
- Click su badge -> naviga a `/app/upgrade`
- Nascosto se `subscription_status === 'active'`

**2B. Soft Paywall (Dialog)**
- Modale dismissable che appare una volta per sessione quando mancano 3 o meno giorni
- Copy motivazionale, bottoni "Vedi Piano Premium" e "Ricordamelo dopo"
- Flag `sessionStorage` per non mostrarlo di nuovo nella stessa sessione

**2C. Pagina /app/upgrade**
- Layout dedicato senza sidebar
- Pricing card con lista benefici
- Bottone "Paga in sicurezza con Stripe" con spinner
- Chiama edge function `create-stripe-checkout`
- Route di successo `/app/upgrade/success` con polling e coriandoli
- Route di cancellazione `/app/upgrade/cancel`

**2D. Read-Only Mode (Hard Paywall)**
- Quando `subscription_status !== 'active'` e `trial_ends_at < now()`:
  - Frontend: disabilita bottoni di azione (Aggiungi, Salva, Modifica) in tutte le pagine
  - Toast al click su bottone disabilitato: "Funzionalita limitata. Attiva Premium."
  - Context provider `useSubscription()` che espone `isReadOnly` a tutti i componenti
- Backend (RLS): Aggiungere policy che blocca INSERT/UPDATE quando trial scaduto e status non active

---

### FASE 3: Integrazione Stripe (Checkout + Webhooks + Portal)

**3A. Edge Function: `create-stripe-checkout`**
- Riceve `weddingId` dall'utente autenticato
- Crea Stripe Checkout Session con `client_reference_id = weddingId`
- Ritorna URL checkout
- Richiede: abilitazione Stripe integration + secret key

**3B. Edge Function: `stripe-webhook`**
- Endpoint pubblico con validazione `Stripe-Signature`
- Gestisce 3 eventi: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Aggiorna `weddings` con `stripe_customer_id`, `subscription_status`, `current_period_end`
- Usa `service_role_key` per bypassare RLS

**3C. Edge Function: `create-portal-session`**
- Riceve `weddingId`, recupera `stripe_customer_id` dal DB
- Genera URL del Stripe Customer Portal con `return_url` verso /settings
- Ritorna URL al frontend

**3D. Tab "Abbonamento" in Settings**
- Rendering condizionale basato su `subscription_status`:
  - Trial: mostra scadenza + bottone "Passa a Premium"
  - Active: mostra data rinnovo + bottone "Gestisci Fatturazione"
  - Canceled/Past_due: mostra stato + bottone "Riattiva"

---

### FASE 4: Ristrutturazione Settings + Email Lifecycle

**4A. Ristrutturazione tab Settings**
- Rinominare tab: "Matrimonio", "Account", "Team", "Abbonamento", "Comunicazioni"
- Tab "Account": aggiungere Danger Zone con "Elimina Account" (digitare ELIMINA per confermare)
- Tab "Account": aggiungere bottone "Cambia Password" con modale
- Tab "Matrimonio": aggiungere Alert Dialog se la data cambia ("Le scadenze verranno ricalcolate")

**4B. Email di Benvenuto (Giorno 1)**
- Trigger: dopo creazione wedding, invia email via Resend
- Contenuto: saluto personalizzato, spiegazione trial 30 giorni, 3 primi passi

**4C. CRON Job Trial Reminders**
- Edge function `check-trial-expirations` schedulata via `pg_cron` ogni notte
- Giorno 25 (5 giorni prima): email soft warning (se `trial_reminder_5d_sent = false`)
- Giorno 28 (2 giorni prima): email hard warning (se `trial_reminder_2d_sent = false`)
- Aggiorna flag nel DB dopo invio per idempotenza

---

## Prerequisiti e Dipendenze

| Prerequisito | Fase |
|---|---|
| Abilitare Stripe integration (secret key) | Fase 3 |
| Configurare Google OAuth (gia disponibile via Lovable Cloud) | Fase 1 |
| Creare prodotto Premium su Stripe Dashboard e ottenere Price ID | Fase 3 |
| Configurare Webhook endpoint su Stripe Dashboard | Fase 3 |
| Configurare Customer Portal su Stripe Dashboard | Fase 3 |

## Ordine di Implementazione Consigliato

Fase 1 e la piu urgente perche tocca il primo contatto utente (conversione). Le Fasi 2-3 possono essere sviluppate insieme. La Fase 4 e indipendente e puo essere fatta in parallelo.

Consiglio di partire dalla **Fase 1** e poi procedere incrementalmente.

