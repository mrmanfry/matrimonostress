

# Sistema di Permessi Granulare per Manager (SoD)

## Problema Attuale

1. **Permessi troppo grossolani**: Il `permissions_config` nel DB ha solo 2 campi (`budget_visible`, `vendor_costs_visible`) e la card `PlannerPermissionsCard` filtra solo per ruolo `planner`, ignorando completamente il ruolo `manager`.

2. **Account Settings inadeguato per manager**: La sezione Account mostra "Ruolo nel Matrimonio" con opzioni "Sono Marco (Partner 1)" / "Sono Laura (Partner 2)" -- non ha senso per un manager che non e ne lo sposo ne la sposa. Inoltre il manager puo cambiare password dell'account, ma non dovrebbe vedere sezioni come "Zona Pericolosa" per eliminare l'account del matrimonio.

3. **Tab Comunicazioni visibile**: Il manager puo vedere e potenzialmente modificare le campagne RSVP/Save the Date, cosa che dovrebbe essere riservata agli sposi.

4. **Tab non filtrate per ruolo**: Il manager vede tutte le 5 tab (Account, Matrimonio, Abbonamento, Comunicazioni, Team) senza restrizioni.

## Soluzione

### 1. Espandere `permissions_config` (JSONB) con nuovi campi

Aggiungere al JSONB `permissions_config` nella tabella `user_roles` i seguenti campi:

```text
permissions_config = {
  budget_visible: boolean,         -- (esistente) Tesoreria e Budget
  vendor_costs_visible: boolean,   -- (esistente) Cifre fornitori
  guests_names_visible: boolean,   -- Nomi e dettagli invitati
  communications_editable: boolean -- Modificare campagne RSVP/STD
}
```

Nessuna migrazione SQL necessaria: il campo e gia JSONB, basta aggiungere le chiavi nel codice. I valori di default saranno `true` (tutto visibile) per non rompere gli utenti esistenti.

### 2. Aggiornare `PermissionsConfig` nel codice

**File: `src/contexts/AuthContext.tsx`**
- Aggiungere a `PermissionsConfig`: `guests_names_visible?: boolean` e `communications_editable?: boolean`

### 3. Espandere `PlannerPermissionsCard` per includere il Manager

**File: `src/components/settings/PlannerPermissionsCard.tsx`**
- Rinominare il componente in `CollaboratorPermissionsCard`
- Filtrare per ruoli `planner` O `manager` (non solo `planner`)
- Aggiungere i nuovi switch:
  - **Nomi e Dettagli Invitati**: se disattivo, il manager non vede nomi/telefoni degli invitati (vedra solo conteggi aggregati)
  - **Comunicazioni**: se disattivo, il manager non puo modificare campagne RSVP/STD

**File: `src/pages/Settings.tsx`**
- Nella sezione Team, mostrare `CollaboratorPermissionsCard` per tutti i ruoli `planner` e `manager`, non solo `planner`

### 4. Adattare Account Settings per il Manager

**File: `src/components/settings/AccountSettingsCard.tsx`**
- Ricevere il ruolo dell'utente corrente come prop
- Se il ruolo e `manager`:
  - Nascondere il selettore "Ruolo nel Matrimonio" (Partner 1/Partner 2) -- non ha senso
  - Mostrare invece un testo informativo: "Sei un Manager per questo matrimonio"
  - Nascondere la "Zona Pericolosa" (elimina account) -- non deve eliminare l'account degli sposi
  - Mantenere: email (read-only), cambio password, digest settimanale

### 5. Filtrare le Tab di Settings per ruolo

**File: `src/pages/Settings.tsx`**
- Recuperare il ruolo dell'utente corrente
- Se `manager`:
  - Nascondere tab "Abbonamento" (non e affar suo)
  - Tab "Comunicazioni": visibile solo se `communications_editable !== false`, altrimenti nascosta
  - Tab "Matrimonio": sola lettura (nascondere bottone "Modifica Dati") oppure nascosta interamente
  - Tab "Team": visibile ma senza poter invitare/rimuovere collaboratori (solo visualizzazione)

### 6. Enforcement nei componenti UI

**Invitati (`src/pages/Guests.tsx`):**
- Se `guests_names_visible === false`: mostrare solo conteggi aggregati, mascherare nomi e numeri di telefono

**Budget/Tesoreria (`src/pages/Treasury.tsx`, Budget):**
- Gia gestito con `budget_visible` -- estendere al manager

**Fornitori (`src/pages/VendorDetails.tsx`):**
- Gia gestito con `vendor_costs_visible` -- estendere al manager

## Riepilogo Modifiche File

| File | Modifica |
|------|----------|
| `src/contexts/AuthContext.tsx` | Estendere `PermissionsConfig` con nuovi campi |
| `src/components/settings/PlannerPermissionsCard.tsx` | Rinominare, supportare manager, aggiungere switch |
| `src/components/settings/AccountSettingsCard.tsx` | Prop ruolo, nascondere sezioni non pertinenti per manager |
| `src/pages/Settings.tsx` | Filtrare tab per ruolo, passare ruolo a AccountSettingsCard |
| `src/pages/Guests.tsx` | Mascherare nomi se `guests_names_visible === false` |
| `src/pages/AppLayout.tsx` | Estendere filtro sidebar per usare permissions anche per manager |

## Matrice Permessi Default

| Permesso | Co-Planner | Planner | Manager (default) |
|----------|-----------|---------|-------------------|
| Budget/Tesoreria | Sempre | Configurabile | Configurabile |
| Costi Fornitori | Sempre | Configurabile | Configurabile |
| Nomi Invitati | Sempre | Sempre | Configurabile |
| Comunicazioni | Sempre | Configurabile | Off di default |
| Modifica Dati Matrimonio | Si | No | No |
| Gestione Team | Si | No | No |
| Abbonamento | Si | No | No |

