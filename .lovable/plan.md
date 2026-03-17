

## Gestione Pernotto (Accommodation Management)

### Panoramica
Nuova sezione dell'app per gestire alloggi degli invitati e degli sposi. Gli hotel sono **fornitori** a tutti gli effetti (categoria "Alloggio"), quindi si integrano nel sistema costi esistente. In più, servono tabelle dedicate per modellare **camere** e **assegnazioni ospiti alle camere**.

### Nuove tabelle DB

**`accommodation_rooms`** — Le camere di ogni hotel/struttura
- `id` uuid PK
- `wedding_id` uuid NOT NULL (FK weddings)
- `vendor_id` uuid NOT NULL (FK vendors — l'hotel)
- `room_name` text NOT NULL (es. "Camera 101")
- `room_type` text (singola, doppia, tripla, suite, family)
- `capacity` integer DEFAULT 2
- `price_per_night` numeric DEFAULT 0
- `nights` integer DEFAULT 1
- `notes` text
- `order_index` integer DEFAULT 0
- `created_at`, `updated_at` timestamptz

**`accommodation_assignments`** — Ospiti assegnati alle camere
- `id` uuid PK
- `room_id` uuid NOT NULL (FK accommodation_rooms)
- `guest_id` uuid NOT NULL (FK guests)
- `created_at` timestamptz
- UNIQUE(room_id, guest_id)

RLS: stesse policy dei vendor (accesso tramite wedding_id via join).

### Integrazione costi
Ogni camera ha `price_per_night * nights` = costo camera. Il totale per hotel = somma costi camere. Questo può anche essere gestito come `expense_item` di tipo `fixed` collegato al vendor hotel, con l'importo sincronizzato dal totale camere. In alternativa, il totale camere viene mostrato come widget informativo nella pagina vendor, senza duplicare in expense_items (l'utente crea manualmente l'expense item con l'importo contrattuale come per gli altri fornitori).

**Approccio scelto**: il costo camere è **informativo** (calcolato live dalla somma delle camere). Il costo contrattuale resta gestito dal sistema expense_items esistente, come per qualsiasi altro fornitore. Questo evita duplicazioni e conflitti.

### Nuova pagina: `/app/accommodation`
- **KPI cards**: totale camere, ospiti assegnati, ospiti senza alloggio, costo totale stimato
- **Lista hotel** (vendor con categoria "Alloggio"): card per ogni struttura con conteggio camere e occupazione
- **Vista dettaglio struttura** (accordion o click → espansione): tabella camere con tipo, capacità, prezzo/notte, notti, totale, ospiti assegnati
- **Assegnazione ospiti**: drag-drop o dialog per assegnare guest alle camere, con filtro per ospiti non ancora assegnati
- **Costo riepilogativo**: totale per struttura e grand total

### Modifiche al layout
- Aggiungere voce "Pernotto" nella sidebar (`AppLayout.tsx`) con icona `Hotel` (lucide)
- Aggiungere route `/app/accommodation` in `App.tsx`

### Componenti da creare
1. **`src/pages/Accommodation.tsx`** — pagina principale con KPI, lista hotel, dettaglio camere
2. **`src/components/accommodation/AccommodationKPIs.tsx`** — widget KPI
3. **`src/components/accommodation/HotelCard.tsx`** — card per singolo hotel
4. **`src/components/accommodation/RoomTable.tsx`** — tabella camere con CRUD inline
5. **`src/components/accommodation/RoomDialog.tsx`** — dialog aggiunta/modifica camera
6. **`src/components/accommodation/RoomAssignmentDialog.tsx`** — assegnazione ospiti a camera
7. **`src/components/accommodation/AccommodationSummary.tsx`** — riepilogo costi

### Flusso utente
1. L'utente va in Fornitori, crea un vendor con categoria "Alloggio" (o una categoria dedicata)
2. Va nella sezione Pernotto → vede gli hotel (vendor della categoria alloggio)
3. Per ogni hotel, aggiunge camere con tipo, capacità, prezzo
4. Assegna ospiti alle camere (dalla lista invitati confermati/previsti)
5. Vede il riepilogo costi per struttura e totale
6. Il costo contrattuale dell'hotel resta gestito in Fornitori → Spese & Pagamenti come per tutti gli altri vendor

### Dettaglio tecnico
- La pagina filtra i vendor per `category_id` dove `expense_categories.name = 'Alloggio'` (o un campo flag `is_accommodation` sui vendor, più robusto)
- Meglio aggiungere un campo **`is_accommodation`** boolean sulla tabella `vendors` per non dipendere dal nome della categoria
- Le query camere usano React Query con chiave `["accommodation-rooms", vendorId]`
- L'assegnazione ospiti mostra solo guest del wedding corrente, con indicatore se già assegnati altrove

