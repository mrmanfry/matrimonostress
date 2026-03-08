

## Fase 2 Catering: Composizione Menu + Stampa

### Concetto

Due parti distinte ma collegate:
1. **Configurazione Menu** — Un nuovo tab "Menu" nella pagina Catering dove gli sposi compongono il menu (portate, piatti, vini). Dati salvati nel JSONB `catering_config` della tabella `weddings`.
2. **Stampa Menu** — Un wizard (stile `PrintInvitationEditor`) che prende i dati del menu configurato e genera PDF stampabili (A5 per tavolo o A6 segnaposto).

### Struttura dati del menu (dentro `catering_config`)

```text
catering_config.menu = {
  title: "Il Nostro Menu",
  courses: [
    { id: "...", category: "Antipasto", items: ["Tartare di tonno", "Bruschetta"] },
    { id: "...", category: "Primo",     items: ["Risotto allo zafferano", "Paccheri all'astice"] },
    { id: "...", category: "Secondo",   items: ["Filetto al pepe verde"] },
    { id: "...", category: "Dolce",     items: ["Torta nuziale", "Millefoglie"] },
    { id: "...", category: "Vini",      items: ["Prosecco Valdobbiadene", "Barolo 2018"] },
  ]
}
```

Nessuna migration SQL necessaria: il campo `catering_config` JSONB esiste già e possiamo estenderlo con la chiave `menu`.

### Parte 1: Tab "Menu" in Catering

**Nuovo file: `src/components/catering/MenuComposer.tsx`**

- Card con pattern View/Edit (matita per modificare, Salva/Annulla)
- Titolo menu editabile (default "Il Nostro Menu")
- Lista portate con categorie predefinite: Antipasto, Primo, Secondo, Contorno, Dolce, Vini, Bevande
- Bottone "+ Aggiungi Categoria" per categorie custom
- Per ogni categoria: lista piatti editabile (input + bottone aggiungi, drag-to-reorder opzionale, tasto elimina)
- In modalità View: rendering elegante del menu come lo vedranno stampato
- Salva in `weddings.catering_config.menu`

**Modifica: `src/pages/Catering.tsx`**
- Aggiungere tab "Menu" tra "Per Tavolo" e "Impostazioni"
- Importare e renderizzare `MenuComposer`
- Aggiungere bottone "Stampa Menu" nell'header (apre il wizard)

### Parte 2: Wizard Stampa Menu

**Nuovo file: `src/components/catering/MenuCardEditor.tsx`**
- Dialog wizard 3 step (stessa architettura di `PrintInvitationEditor`)
- Step 1 — Design: upload sfondo, font, edge style, scelta formato (A5/A6), preview live con i dati del menu configurato
- Step 2 — Audience: modalita "Per Tavolo" (checkbox tavoli) o "Segnaposto" (checkbox ospiti confermati)
- Step 3 — Generazione: pipeline `html2canvas` → `jspdf` → ZIP

**Nuovo file: `src/components/catering/MenuDesignStep.tsx`**
- Riuso logica di `PrintDesignStep` (upload foto, drag, scale, font, edge style)
- Preview: foto sopra, sotto il titolo + lista portate centrate + nomi sposi e data in fondo
- Toggle formato A5/A6

**Nuovo file: `src/components/catering/MenuAudienceStep.tsx`**
- Radio "Per Tavolo" / "Segnaposto"
- Lista tavoli o ospiti confermati con checkbox
- Per segnaposto: badge dieta accanto al nome

**Nuovo file: `src/components/catering/HiddenMenuNode.tsx`**
- Nodo nascosto per render PDF ad alta risoluzione
- A5: 1748x2480px, A6: 1240x1748px
- Foto sopra con edge style, testo sotto con menu completo

**Riuso: `src/components/print/PrintGenerationStep.tsx`** (import diretto, stessa UI progress)

### File da creare
| File | Descrizione |
|------|-------------|
| `src/components/catering/MenuComposer.tsx` | Tab configurazione menu (View/Edit) |
| `src/components/catering/MenuCardEditor.tsx` | Wizard stampa menu (3 step) |
| `src/components/catering/MenuDesignStep.tsx` | Step 1: design con preview menu |
| `src/components/catering/MenuAudienceStep.tsx` | Step 2: selezione tavoli/ospiti |
| `src/components/catering/HiddenMenuNode.tsx` | Nodo nascosto per render PDF |

### File da modificare
| File | Modifica |
|------|----------|
| `src/pages/Catering.tsx` | Tab "Menu" + bottone "Stampa Menu" + import nuovi componenti |

### Nessuna migration SQL
I dati del menu vengono salvati dentro `catering_config` (JSONB già esistente) con la chiave `menu`.

