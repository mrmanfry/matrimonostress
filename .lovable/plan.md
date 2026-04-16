
Confermato: niente backfill, +1 sempre adulto. Procedo con il piano.

## Piano esecutivo

**1. Migration DB**
```sql
ALTER TABLE public.guests 
  ADD COLUMN plus_one_of_guest_id UUID NULL 
  REFERENCES public.guests(id) ON DELETE SET NULL;
CREATE INDEX idx_guests_plus_one_of ON public.guests(plus_one_of_guest_id);
```

**2. Edge function `rsvp-handler` — branch SUBMIT**

Per ogni `member` aggiornato, dopo l'UPDATE del titolare:

- **Se `member.rsvpStatus === 'confirmed'` e `plusOneName` non vuoto:**
  - Cerca guest esistente con `plus_one_of_guest_id === member.id`
  - **Non esiste** → INSERT:
    ```
    wedding_id, party_id (= titolare.party_id, garantito da ensure_party_for_rsvp)
    first_name/last_name: split di plusOneName
    rsvp_status: 'confirmed'
    menu_choice: plusOneMenu
    adults_count: 1, children_count: 0, is_child: false
    allow_plus_one: false
    plus_one_of_guest_id: member.id
    ```
  - **Esiste** → UPDATE nome/menu

- **Se `plusOneName` vuoto/null o titolare `declined`:**
  - DELETE guest con `plus_one_of_guest_id === member.id` (se esiste)

Vale sia per branch party che single (in single, `ensure_party_for_rsvp` ha già creato il party).

**3. Adattamenti UI**

- `src/pages/Tables.tsx`: la generazione "virtual +1" (righe 167-235) e la conversione al drag (393-431, 504-540) restano come fallback solo per +1 **non ancora confermati** (titolare con `allow_plus_one=true` ma senza guest reale collegato via `plus_one_of_guest_id`).
- `src/components/guests/GuestNucleoCard.tsx`: badge "+1 di [Nome titolare]" sui guest con `plus_one_of_guest_id` valorizzato.
- `src/pages/Guests.tsx`: `confirmedPlusOnes` (~riga 961) basato su `COUNT(plus_one_of_guest_id IS NOT NULL)` invece di `plus_one_name`.

**4. Cosa NON tocco**
- `useGuestMetrics`, `Catering.tsx`, `Treasury.tsx`, `expectedCalculator.ts` → leggono già `guests` e funzioneranno automaticamente
- Form RSVP pubblico (`FormalInviteView`) → invariato
- Token/URL esistenti → invariati

**File modificati**
- MIGRATION: nuova colonna + indice
- `supabase/functions/rsvp-handler/index.ts`
- `src/pages/Tables.tsx` (semplificazione virtual +1)
- `src/components/guests/GuestNucleoCard.tsx` (badge)
- `src/pages/Guests.tsx` (conteggio)
