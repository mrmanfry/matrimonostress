

## Plan: Persistere il design dell'invito cartaceo

### Problema
Quando l'utente chiude il wizard e lo riapre, tutte le impostazioni (foto, font, bordo, posizione/scala immagine) vengono resettate. L'utente deve ricominciare da capo ogni volta.

### Soluzione
Salvare le impostazioni di design nel database e la foto nello storage, così alla riapertura il wizard ripristina l'ultimo stato.

### Implementazione

**1. Migrazione database** — Aggiungere una colonna `print_design` (JSONB, nullable) alla tabella `weddings`:
```json
{
  "fontStyle": "garamond",
  "edgeStyle": "watercolor",
  "imageTransform": { "x": 0, "y": 10, "scale": 0.8 },
  "backgroundImagePath": "wedding-id/print_bg_1234.jpg"
}
```

**2. Storage bucket** — Creare un bucket `print-assets` (privato) per salvare la foto di sfondo dell'invito. Il path sarà `{weddingId}/print_bg_{timestamp}.{ext}`.

**3. Logica in `PrintInvitationEditor.tsx`**:
- **Al mount (quando `open` diventa `true`)**: leggere `weddings.print_design`, caricare le impostazioni nello state, e scaricare la foto dallo storage per ricreare il blob URL.
- **Al salvataggio**: quando l'utente cambia step (da 1 a 2) oppure clicca "Genera", fare un upsert delle impostazioni + upload della foto se cambiata.
- **`handleClose`**: rimuovere solo lo state temporaneo (step, progress, selezione destinatari), NON resettare le impostazioni di design.

**4. Upload foto** — Nel callback `onBackgroundChange` di `PrintDesignStep`, oltre a settare lo state locale, marcare la foto come "dirty" per l'upload successivo. L'upload effettivo avviene quando si avanza allo step 2 (così non si fanno upload inutili).

**5. RLS** — Policy sulla colonna `print_design`: ereditata dalle policy esistenti sulla tabella `weddings` (già protetta). Per il bucket `print-assets`: policy che permette INSERT/SELECT/DELETE ai membri del wedding (stesse regole di `vendor-contracts`).

### File coinvolti
- **Migrazione SQL**: nuova colonna + bucket + RLS policies
- `src/components/print/PrintInvitationEditor.tsx`: logica load/save, rimozione reset design da `handleClose`

