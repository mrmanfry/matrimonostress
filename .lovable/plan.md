

## Piano: Grammatica Italiana Gender-Aware nei Saluti

### Problema attuale

Il motore saluti usa sempre **"Cari"** / **"Gentilissimi"** per coppie e nuclei, ignorando il genere dei membri:
- "Alessandra e Mariachiara" → "Cari" (sbagliato, dovrebbe essere "Care")
- "Famiglia Baglioni" → "Cari" (corretto)
- Due maschi → "Cari" (corretto)
- Maschio + femmina → "Cari" (corretto, maschile sovraesteso in italiano)

### Regole grammaticali da implementare

| Caso | Informal | Formal |
|------|----------|--------|
| Singolo M | Caro | Gentile |
| Singolo F | Cara | Gentile |
| Coppia M+M | Cari | Gentilissimi |
| Coppia F+F | **Care** | **Gentilissime** |
| Coppia M+F | Cari | Gentilissimi |
| Nucleo "Famiglia X" | Cari | Gentilissimi |
| Nucleo con nomi (es. "Alessandra e Mariachiara") | **gender-aware** | **gender-aware** |
| Gruppo >2 | gender-aware | gender-aware |

**Regola**: se **tutti** gli adulti sono F → "Care" / "Gentilissime". Altrimenti → "Cari" / "Gentilissimi".

Per i nuclei con `nucleusName` che inizia con "Famiglia" → sempre "Cari"/"Gentilissimi" (convenzione italiana).

### Modifiche

**File**: `src/lib/greetingEngine.ts`

1. Aggiungere una funzione helper `resolvePluralPrefix(adults, greetingType)`:
   - Risolve il genere di ogni adulto via `resolveGender()`
   - Se tutti sono `F` → informal: "Care", formal: "Gentilissime"
   - Altrimenti → informal: "Cari", formal: "Gentilissimi"

2. Nel blocco **nucleus/large group** (riga 84-93):
   - Se `nucleusName` inizia con "Famiglia" → "Cari"/"Gentilissimi" (invariato)
   - Altrimenti → usare `resolvePluralPrefix(adults, greetingType)`

3. Nel blocco **couple** (riga 115-129):
   - Sostituire il prefix fisso "Cari"/"Gentilissimi" con `resolvePluralPrefix(adults, greetingType)`

4. Aggiornare i `STRESS_MOCKS` in `OverlayCanvasEditor.tsx` per includere un caso "due femmine" per testing visivo.

