

# Fix: Nome ospite al primo scatto + KPI bar migliorata

## Problemi identificati

### 1. Prima foto sempre "Anonimo"
In `handlePhotoTaken` (riga 161-168), la foto viene inviata PRIMA di chiedere il nome. Il flusso attuale:
1. Ospite preme shutter → `handlePhotoTaken(blob)` chiamato
2. Upload parte con `guestName = null`
3. Solo DOPO appare il `GuestNameSheet`

**Fix**: Mostrare il `GuestNameSheet` PRIMA dello scatto. Al primo tap sul shutter, intercettare, mostrare il name sheet, salvare il blob in un ref, e inviare la foto solo dopo che l'utente conferma/salta il nome.

### 2. KPI Bar
- **"Giorni"**: non ha senso per un ospite → rimuovere
- **"Fotografi"**: poco chiaro → cambiare label in "Ospiti" con sotto-label "al rullino"
- **"Scatti"**: mostrare formato `3/27` (taken/total) invece del solo numero

## File modificati

### `src/pages/CameraPublic.tsx`
- Aggiungere un `pendingBlob` ref per salvare la foto in attesa del nome
- Modificare `handlePhotoTaken`: se è il primo scatto e non c'è nome, salvare il blob nel ref e mostrare il name sheet SENZA inviare
- In `handleNameSubmit` e `onSkip`: dopo aver settato il nome, inviare il blob pendente
- KPI bar: rimuovere "Giorni", cambiare "Scatti" in formato `shotsTaken/shotsTotal`, cambiare "Fotografi" in "Ospiti"

### `src/components/memories/GuestNameSheet.tsx`
Nessuna modifica necessaria.

## Dettagli tecnici

```
// Nuovo flusso primo scatto:
pendingBlobRef = useRef<Blob | null>(null)

handlePhotoTaken(blob):
  if firstShot && !guestName:
    pendingBlobRef.current = blob  // salva, NON invia
    setShowNameSheet(true)
    return                          // esce senza upload

handleNameSubmit(name):
  setGuestName(name)
  setShowNameSheet(false)
  if pendingBlobRef.current:
    uploadPhoto(pendingBlobRef.current, name)  // ora invia con nome
    pendingBlobRef.current = null

// KPI bar:
<div>"${shotsTaken}/${shotsTotal}"</div> label="Scatti"
<div>{participantCount}</div> label="Ospiti"
// rimuovere il terzo box "Giorni"
```

