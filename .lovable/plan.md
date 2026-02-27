

# Fix: Email Invito + Flusso Accesso Collaboratore Multi-Matrimonio

## Problemi Identificati

### 1. Branding email errato
L'email viene inviata come **"Matrimonio Senza Stress &lt;info@stenders.cloud&gt;"** con stile generico (gradient viola, footer "Wedding Planner App"). Deve essere **"WedsApp &lt;info@stenders.cloud&gt;"** con i colori del brand (navy `hsl(243, 75%, 58%)`, font Lato), coerente con i template auth gia configurati per `notify.wedsapp.it`.

### 2. Il codice di accesso funziona, ma solo per utenti NUOVI (senza matrimonio)
Il form "Ho un Codice di Accesso" appare nella Dashboard **solo se l'utente non ha nessun matrimonio** (`!wedding`). Se il collaboratore invitato ha gia un suo matrimonio (come nel tuo caso), non vedra mai quel form -- la dashboard carica direttamente il suo matrimonio esistente.

**Manca un punto di ingresso per utenti che hanno gia un matrimonio.**

### 3. Il ruolo assegnato e sempre "manager" indipendentemente dall'invito
Quando un utente inserisce il codice, il `handleJoinWithCode` nella Dashboard assegna sempre il ruolo `manager` (riga 297), ignorando il ruolo specificato nell'invito originale (co_planner, planner, manager). Dovrebbe leggere il ruolo dall'invito salvato nella tabella `wedding_invitations`.

---

## Soluzione

### A. Rebrand dell'email di invito
**File: `supabase/functions/send-wedding-invitation/index.ts`**

- Cambiare il mittente da `"Matrimonio Senza Stress <info@stenders.cloud>"` a `"WedsApp <noreply@wedsapp.it>"` (o il dominio configurato)
- Riscrivere il template HTML con lo stile del brand: colore navy (`hsl(243, 75%, 58%)`), font Lato, border-radius arrotondati, tono coerente
- Aggiornare il footer da "Wedding Planner App" a "WedsApp"
- Aggiornare i link da `stenders.cloud` a `matrimonostress.lovable.app` (URL pubblicato attuale)
- Rendere il CTA un link diretto: `https://matrimonostress.lovable.app/app/dashboard?join=WED-XXXX` per pre-compilare il codice

### B. Aggiungere flusso "Unisciti a un matrimonio" per utenti esistenti
**File: `src/components/workspace/WorkspaceSwitcher.tsx`**

- Aggiungere nel dropdown del WorkspaceSwitcher un'opzione "Unisciti con codice" (icona +)
- Cliccandola, si apre un dialog con input per il codice di accesso
- La logica di join e la stessa del Dashboard, ma accessibile anche da utenti che hanno gia un matrimonio

**File: `src/pages/Dashboard.tsx`**

- Leggere il parametro URL `?join=WED-XXXX` al caricamento
- Se presente e l'utente e autenticato, eseguire automaticamente il join (o mostrare conferma)

### C. Assegnare il ruolo corretto dall'invito
**File: `src/pages/Dashboard.tsx` (handleJoinWithCode) e nuovo dialog nel WorkspaceSwitcher**

- Dopo aver trovato il matrimonio tramite access_code, cercare nella tabella `wedding_invitations` un invito corrispondente (email utente + wedding_id + status pending)
- Se trovato, usare il ruolo dall'invito invece di hardcodare `manager`
- Aggiornare lo status dell'invito a `accepted`
- Se non trovato (join spontaneo), usare `manager` come fallback

---

## Dettagli Tecnici

### Flusso rivisto per il collaboratore invitato

```text
1. Riceve email WedsApp con link diretto
2. Clicca il link -> arriva su /app/dashboard?join=WED-D858
3a. Se non ha account -> redirect a /auth, dopo login torna alla dashboard con ?join
3b. Se ha gia un account con matrimonio -> il parametro ?join avvia il join automatico
4. Il sistema cerca l'invito in wedding_invitations, assegna il ruolo corretto
5. refreshAuth() aggiorna il contesto, il nuovo matrimonio appare nel WorkspaceSwitcher
```

### File modificati

| File | Modifica |
|------|----------|
| `supabase/functions/send-wedding-invitation/index.ts` | Rebrand completo: mittente, stile, link diretto con `?join=` |
| `src/components/workspace/WorkspaceSwitcher.tsx` | Aggiungere opzione "Unisciti con codice" + dialog |
| `src/pages/Dashboard.tsx` | Leggere `?join=` da URL, correggere ruolo da `wedding_invitations` |
| Nuovo: `src/components/workspace/JoinWeddingDialog.tsx` | Dialog riutilizzabile per inserire codice accesso |

### Note

- Il dominio email attuale per le email transazionali usa Resend con `info@stenders.cloud`. Se preferisci usare `notify@wedsapp.it` (gia configurato per le auth email), dovra essere verificato anche per Resend. In alternativa si puo mantenere `stenders.cloud` ma cambiare il nome mittente a "WedsApp".
- Il `WorkspaceSwitcher` e gia funzionante per utenti multi-matrimonio -- basta aggiungere il punto di ingresso "join".

