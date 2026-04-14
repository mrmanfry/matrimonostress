
## Piano: correggere definitivamente genere e nome stampato nei saluti

### Problema reale individuato
Il nome del nucleo ora viene preso correttamente, ma la logica attuale fa ancora un errore chiave:

- in `src/lib/printNameResolver.ts` se esiste `party_name` restituisce sempre `Cara ${party_name}`
- quindi sbaglia tutti i nuclei con:
  - due femmine → deve essere `Care ...`
  - gruppo misto / con almeno un uomo → deve essere `Cari ...`
- inoltre il singolo senza nucleo in alcuni punti continua a usare anche il cognome nel nome stampato

Questo spiega esattamente i casi che hai riportato:
- `Alessandra e Mariachiara` → deve essere `Care`
- `Filippo, Carolina e Leopoldo` → deve essere `Cari`
- `Stefania, Angelo e Roberto` → deve essere `Cari`
- `Roberto e Alejo` → deve essere `Cari`
- `Pietro Dessì` singolo → deve diventare `Caro Pietro` e non usare il cognome nel saluto

### Regola finale da applicare
Userò questa regola unica in tutto il flusso stampa:

- **1 adulto senza nucleo** → `Caro Nome` / `Cara Nome`
- **nucleo con `party_name` valorizzato**:
  - se tutti gli adulti sono femmine → `Care ${party_name}`
  - altrimenti → `Cari ${party_name}`
- il saluto del singolo deve usare **solo il nome**
- il nome mostrato/stampato per il singolo va riallineato dove serve per evitare fallback col cognome

### File da aggiornare

#### 1) `src/lib/printNameResolver.ts`
Correggere `resolveGreeting()`:
- non usare più sempre `Cara ${party.party_name}`
- se `party_name` esiste:
  - calcolare il prefisso da tutti gli adulti del nucleo
  - `Care` se tutte donne
  - `Cari` in ogni altro caso
- mantenere il singolo gender-aware con solo `first_name`

Correggere anche `resolveDisplayName()`:
- per un singolo adulto restituire solo `first_name`
- così evitiamo output tipo `Pietro Dessì` nei casi in cui non serve

#### 2) `src/lib/greetingEngine.ts`
Allineare anche il motore preview del Print Studio:
- oggi per `party.isNucleo || adults.length > 2` usa sempre `Cara ${nucleusName}`
- va cambiato per usare la stessa regola:
  - tutte donne → `Care`
  - altrimenti → `Cari`
- per il singolo deve restare `Caro/Cara Nome`

Questo serve a far combaciare anteprima e PDF.

#### 3) Verifica dei due flussi
Controllare che entrambi leggano il saluto già corretto dal resolver:
- `src/components/invitations/PrintStudio.tsx`
- `src/components/print/PrintInvitationEditor.tsx`

Non serve cambiare il flusso dati se il resolver viene corretto bene, ma va verificato che non ci siano fallback che ricostruiscono il nome dal display.

### Casi da verificare dopo il fix
- `Alessandra e Mariachiara` → `Care Alessandra e Mariachiara`
- `Filippo, Carolina e Leopoldo` → `Cari Filippo, Carolina e Leopoldo`
- `Stefania, Angelo e Roberto` → `Cari Stefania, Angelo e Roberto`
- `Roberto e Alejo` → `Cari Roberto e Alejo`
- singola donna → `Cara Alessandra`
- singolo uomo → `Caro Pietro`

### Impatto atteso
Dopo questa correzione:
- il nucleo continuerà a usare il suo nome come fonte di verità
- il prefisso sarà finalmente corretto per femminile/maschile plurale
- i singoli non porteranno più dietro il cognome nel saluto o nei fallback di stampa
- preview e PDF torneranno coerenti

### Dettaglio tecnico
La causa è semplice e localizzata:
- `printNameResolver.ts` ha un hardcode `Cara ${party.party_name}`
- `greetingEngine.ts` ha lo stesso hardcode nel ramo nucleo/large group

Quindi il fix è mirato: sostituire quell’hardcode con una funzione condivisa di prefisso plurale basata sugli adulti effettivi del party.
