

## Plan: Filtro "Da generare", PDF separati per nucleo, nomi file intelligenti

### 3 problemi da risolvere

1. **Filtro mancante**: Non si può filtrare per escludere i nuclei già stampati. Serve un tab "Da generare" che mostri solo quelli senza PDF.

2. **200 PDF in un unico file**: Attualmente tutti gli inviti finiscono in un singolo PDF multipagina (`Inviti_Cartacei_Nozze.pdf`). Impossibile distinguere chi è chi. Soluzione: generare **un PDF per nucleo** con nome file basato sul displayName (es. `Famiglia_Rossi.pdf`). Se sono selezionati più di 1 nucleo, creare un **file ZIP** che li contiene tutti.

3. **Nome file generico**: Anche il singolo PDF si chiama `Inviti_Cartacei_Nozze.pdf`. Deve chiamarsi come il nucleo.

### Implementazione

**PrintAudienceStep.tsx** — Aggiungere un terzo tab filtro:
- `all` → Tutti i Nuclei
- `pending` → Solo In Attesa (RSVP)
- `not_printed` → Da Generare (esclude quelli in `printedPartyIds`)

**PrintInvitationEditor.tsx** — Riscrivere `generatePDF()`:
- Se 1 nucleo selezionato → singolo PDF, nome = `Invito_{displayName}.pdf` (spazi → underscore)
- Se 2+ nuclei → generare un PDF per nucleo, poi impacchettarli in uno ZIP via la libreria `JSZip` (da aggiungere come dipendenza)
- Nome ZIP: `Inviti_Cartacei_{data}.zip`
- Ogni PDF dentro lo ZIP: `Invito_{displayName}.pdf`

**Dipendenza nuova**: `jszip` per la creazione dello ZIP lato client.

### File coinvolti
1. `src/components/print/PrintAudienceStep.tsx` — nuovo tab filtro "Da generare"
2. `src/components/print/PrintInvitationEditor.tsx` — logica PDF singoli + ZIP + nomi file
3. `package.json` — aggiunta `jszip`

