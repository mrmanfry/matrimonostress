

## Piano: Fix Logica Saluti in printNameResolver.ts

### Problema

Ci sono **due sistemi** di generazione saluti:
1. `greetingEngine.ts` — usato nel Print Studio (overlay) → **già corretto** dopo le modifiche recenti
2. `printNameResolver.ts` — usato nel Design Integrato (`PrintInvitationEditor`) → **ha bug**

Bug in `printNameResolver.ts`:
- Riga 58: `"Cara Famiglia Rossi"` — usa sempre "Cara" per Famiglia, dovrebbe essere **"Cari"** (convenzione italiana: Famiglia → maschile plurale)
- Righe 63-66: usa sempre `"Cari"` senza controllare il genere — due femmine dovrebbe dare **"Care"**

### Modifiche

**File**: `src/lib/printNameResolver.ts`

1. Aggiungere la stessa logica gender-aware del `greetingEngine.ts`:
   - Stesso-cognome → `"Cari Famiglia X"` (non "Cara")
   - Cognomi diversi → `resolvePluralPrefix()`: se tutti F → "Care", altrimenti "Cari"

2. Allineare `resolveGreeting()` e `resolveGreetingSolo()` alla grammatica corretta:
   - Singolo M → "Caro Nome"
   - Singolo F → "Cara Nome"  
   - Nucleo Famiglia → "Cari Famiglia X"
   - Nucleo nomi (tutte F) → "Care Nome1 e Nome2"
   - Nucleo nomi (misto/M) → "Cari Nome1 e Nome2"

Nessun altro file da modificare — `greetingEngine.ts` è già corretto.

