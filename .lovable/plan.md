
## Piano: usare sempre il nome del nucleo come fonte di verità nei saluti

### Diagnosi
Il comportamento non segue la regola richiesta per due motivi distinti:

1. `src/lib/printNameResolver.ts`
   - `resolveGreeting()` oggi ignora `party_name` per costruire il saluto.
   - Se ci sono più adulti, ricalcola da cognomi e nomi dei membri, quindi inventa formule tipo `Cari Roberto, Angelo e Stefania`.

2. `src/lib/printGeneratorEngine.ts`
   - Il Print Studio non passa il nucleo reale al motore PDF.
   - Oggi ricostruisce un `MockParty` partendo da `displayName` con `buildMockPartyFromName(...)`, che perde il significato di “nucleo” e può trasformare `Famiglia Luca Baglioni` o `Stefania, Angelo e Roberto` in coppie/liste nomi non desiderate.

### Regola da applicare
Allineo tutto a questa logica:

- **Singolo**: `Caro Nome` / `Cara Nome`
- **Nucleo con nome valorizzato (`party_name`)**: usare sempre il nome del nucleo, senza espandere i membri
  - esempio: `Cara Stefania, Angelo e Roberto`
  - esempio: `Cara Famiglia Luca Baglioni`

Quindi il nome del nucleo diventa la fonte di verità, non i nomi dei singoli ospiti.

### Modifiche previste

#### 1) `src/lib/printNameResolver.ts`
Aggiorno `resolveGreeting()` così:
- se il party ha `party_name` ed è un nucleo/multi-ospite, restituisce direttamente `Cara ${party.party_name}`
- solo se manca `party_name`, usa il fallback attuale sui membri
- `resolveGreetingSolo()` resta gender-aware per il singolo

In parallelo verifico anche `resolveDisplayName()` per mantenere coerente il nome stampato.

#### 2) `src/lib/greetingEngine.ts`
Aggiorno il motore condiviso del saluto preview:
- se `party.isNucleo === true` e `party.nucleusName` esiste, in modalità informale restituisce `Cara ${nucleusName}`
- non deve più derivare il nome dai membri quando il nome del nucleo è già presente

Questo serve per far combaciare preview ed export.

#### 3) `src/components/invitations/PrintStudio.tsx`
Cambio il caricamento dei destinatari del Print Studio:
- invece di passare al generatore solo `displayName` + `syncToken`, preparo anche i dati reali del nucleo necessari al saluto
- per ogni party salvo esplicitamente il `party_name` / stato nucleo, così il PDF non deve più “indovinare”

#### 4) `src/lib/printGeneratorEngine.ts`
Rimuovo la dipendenza da `buildMockPartyFromName(displayName)` come sorgente principale per i saluti:
- il generatore deve ricevere il nucleo reale o il saluto già risolto
- così il PDF usa esattamente `Cara Stefania, Angelo e Roberto` oppure `Cara Famiglia Luca Baglioni`
- niente più riordino nomi, niente più parsing fragile del `displayName`

### Effetto finale atteso
Dopo il fix:

- `Stefania, Angelo e Roberto` → `Cara Stefania, Angelo e Roberto`
- `Famiglia Luca Baglioni` → `Cara Famiglia Luca Baglioni`
- singolo uomo → `Caro Marco`
- singola donna → `Cara Stefania`

### Verifica
Controllerò entrambi i flussi:
1. **Design Integrato**
2. **Print Studio / Porta il tuo design**

Con test mirati su:
- un singolo uomo
- una singola donna
- un nucleo con nome custom (`Stefania, Angelo e Roberto`)
- un nucleo stile famiglia (`Famiglia Luca Baglioni`)

Obiettivo: stessa stringa nel preview e nello scaricamento PDF, senza calcoli automatici sui membri quando esiste già il nome del nucleo.
