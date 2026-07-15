## Problema

Nell'imperiale tre viste dello stesso tavolo si comportano in modo diverso quando un ospite non ha una `seat_position` esplicita (caso Elena Picalarga) o quando l'indice dei posti non è allineato.

### 1. Mobile mostra Elena "Senza posto", desktop no
- **Desktop** (`ImperialTableSvg.tsx`, righe 38–50): se un ospite non ha `seat_position`, viene automaticamente riempito nel primo posto libero. Elena appare seduta.
- **Mobile** (`MobileTableSheet.tsx`, righe 74–81): filtra rigidamente per `seat_position != null`, e chi non ce l'ha finisce in una sezione separata "Senza posto".
- Risultato: la stessa persona seduta a desktop → non seduta a mobile.

### 2. PDF export mostra Elena nel posto sbagliato / non assegnata
- In `pdfHelpers.ts` (righe 275–357) c'è un **off-by-one**: `seat_position` nel resto dell'app è 0-based (0..capacity-1), ma il PDF costruisce `seatMap` con le chiavi 0-based e poi cerca `seatMap.get(i)` con `i` che va da **1 a halfCap** per il Lato A e da `halfCap+1` a `capacity` per il Lato B. Quindi il posto 0 non viene mai disegnato e tutti gli altri sono spostati di uno → chi ha `seat_position = 0` (probabilmente Elena) sparisce dal diagramma.
- Inoltre, come sul mobile, chi ha `seat_position = null` non viene messo in nessun posto libero: il PDF non applica il fallback che fa il desktop.

### 3. Ospiti con nomi neri/grigi nel PDF
- Nel "Dettaglio Posti" (righe 378–416): quando un ospite ha `dietary_restrictions`, viene chiamato `setTextColor(220,38,38)` (rosso) **prima** di aggiungere gli altri dettagli. Tutti i dettagli di quell'ospite (menù, note) diventano rossi.
- Il colore viene resettato solo dentro `if (details.length > 0)`; se un ospite senza dietary segue uno con dietary, il nome/seat label di quello dopo può ereditare colori residui a seconda del path. Da qui l'aspetto "alcuni neri, alcuni grigi/rossi".

### 4. "poi ci sta & poi allergie non si capisce niente"
- Riga 400 e 433 stampano `⚠ ${guest.dietary_restrictions}` con font Helvetica standard di jsPDF, che usa WinAnsi e **non supporta il carattere `⚠`**. Viene reso come glifo corrotto (`&` o box). In più `splitTextToSize` con margine stretto spezza il testo dentro il seat label, creando l'effetto illeggibile.

---

## Piano di correzione

### A. Unificare la logica "ospite seduto" per l'imperiale
Creare un piccolo helper condiviso (es. `src/components/tables/imperialSeating.ts`) che, dato `assignments` di un tavolo imperiale e la sua `capacity`, restituisca un array `seats[0..capacity-1]` applicando:
1. prima i guest con `seat_position` valida,
2. poi fallback dei non posizionati nei primi posti liberi (stessa logica del desktop).

Usarlo in **tutti e tre** i posti:
- `ImperialTableSvg.tsx` (desktop) — sostituire il blocco 38–50 con l'helper.
- `MobileTableSheet.tsx` — al posto di `sideA/sideB/noSeat` calcolare `seats` con l'helper, poi splittare in Lato A (indici `< perSide`) e Lato B (indici `>= perSide`). Rimuovere la sezione "Senza posto" per l'imperiale.
- `pdfHelpers.ts` — costruire `seatMap` dall'array `seats` dell'helper.

Risultato: Elena appare nello stesso posto ovunque.

### B. Correggere l'off-by-one nel PDF
- Iterare i posti con indici 0-based: `for (let idx = 0; idx < halfCap; idx++)` per Lato A e `for (let idx = halfCap; idx < capacity; idx++)` per Lato B.
- Usare `seats[idx]` (dall'helper) invece di `seatMap.get(i)` 1-based.
- Nella label a schermo mostrare `idx + 1` (numero posto umano), ma il lookup è 0-based.
- Nel "Dettaglio Posti" mostrare `seat_position + 1` invece di `seat_position` grezzo (righe 385, 388).

### C. Pulire la gestione colori nel PDF
- **Sempre** `setTextColor(0,0,0)` a inizio di ogni ospite (prima di stampare nome e seat label).
- Applicare il rosso `setTextColor(220,38,38)` **solo** sulla singola riga della restrizione alimentare, non su tutti i `details`.
- Reset a `(0,0,0)` a fine di ogni riga di dettaglio, non solo dentro `if (details.length > 0)`.

### D. Risolvere il glifo illeggibile e le allergie
- Sostituire `⚠` con un prefisso testuale ASCII/Latin-1 sicuro, es. `"Allergie: "` (o `"[!] Allergie: "`). Nessun emoji/glifo unicode non supportato da Helvetica.
- Aumentare `maxWidth` a ~155 e assicurare che allergie e note stiano su righe proprie con andata a capo pulita.

### E. Verifica visuale
Dopo le modifiche, rigenerare il PDF di prova (tavolo imperiale con Elena) e confrontare a colpo d'occhio con la vista desktop: stesso ordine, stessi posti, testo leggibile, colori coerenti (nero per nome, rosso solo per la riga allergie).

---

## File toccati

- `src/components/tables/imperialSeating.ts` (nuovo helper)
- `src/components/tables/v2/ImperialTableSvg.tsx`
- `src/components/tables/MobileTableSheet.tsx`
- `src/utils/pdfHelpers.ts`

Nessuna modifica al database o alla business logic delle assegnazioni: sto solo unificando come i tre render leggono `seat_position` e sistemando il rendering del PDF.