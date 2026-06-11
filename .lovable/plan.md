# Unificare il caricamento app

## Problema
All'apertura dell'app si vedono due schermate di loading consecutive con stile diverso:
1. `ProtectedRoute` → sfondo `bg-gradient-hero`, cuore grande, testo "Caricamento..."
2. `AppLayout` → sfondo bianco/trasparente, cuore più piccolo, testo "Caricamento dati matrimonio..."

Il passaggio fra le due crea un "flash" poco elegante (cambio di sfondo e di dimensioni).

## Soluzione
Creare un componente unico `LoadingScreen` riutilizzato in entrambi i punti, così la transizione tra le due fasi (auth → wedding data) è invisibile: stesso sfondo, stessa posizione del logo, stesso tipo carattere. Cambia solo, eventualmente, il sotto-testo con un fade morbido.

### Componente nuovo: `src/components/shared/LoadingScreen.tsx`
- Sfondo: `bg-gradient-hero` (coerente con il resto dei flussi auth).
- Logo/icona centrale: `Heart` accent pulsante, dimensione unica (w-14 h-14).
- Titolo fisso "WedsApp" in font serif (coerente brand).
- Sotto-testo opzionale (prop `message`) con transizione opacity 300ms quando cambia, così l'aggiornamento del messaggio non sembra una nuova schermata.
- Wrapper `min-h-screen flex items-center justify-center`.

### Integrazioni
- `src/guards/ProtectedRoute.tsx`: sostituire il blocco `status === "loading"` con `<LoadingScreen message="Caricamento..." />`.
- `src/pages/AppLayout.tsx`: sostituire il blocco `loadingWedding` con `<LoadingScreen message="Preparazione del tuo matrimonio..." />`.

### Risultato
L'utente vede sempre la stessa schermata calma; solo la riga di testo cambia in fade. Niente più "flash" tra due UI diverse.

## File toccati
- creato: `src/components/shared/LoadingScreen.tsx`
- modificato: `src/guards/ProtectedRoute.tsx`
- modificato: `src/pages/AppLayout.tsx`
