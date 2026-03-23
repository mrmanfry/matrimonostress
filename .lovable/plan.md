

## Ottimizzazione Tavoli: Layout, Azioni Bulk e Smart Planner AI

### Problemi identificati

1. **Layout non responsive** — Il grid `lg:grid-cols-4` crolla su mobile senza adattamento. La GuestPool e i tavoli si sovrappongono. Su mobile serve un layout a tab (pool/sala) invece che side-by-side.
2. **Mancano azioni bulk** — Non c'è modo di svuotare un singolo tavolo, tutti i tavoli, o eliminare un tavolo. L'unica azione è rimuovere un ospite alla volta.
3. **Smart Planner non è intelligente** — L'algoritmo attuale è puramente basato su pesi statici (`VIBE_WEIGHTS`). Non usa l'AI. Mette gente "random" perché le categorie degli ospiti spesso sono vuote/generiche e l'affinità calcolata è quasi zero.

### Piano di intervento

#### 1. Layout responsive mobile/desktop
**Files: `Tables.tsx`, `TableCanvas.tsx`, `GuestPool.tsx`**

- Su mobile (`< 768px`): sostituire il grid con **due tab** ("Da Assegnare" / "Sala") usando il componente `Tabs` esistente
- I bottoni header diventano un menu dropdown su mobile (troppi per una riga)
- `TableCanvas`: su mobile usare `grid-cols-1` invece di `grid-cols-3`
- `GuestPool`: rimuovere altezza fissa `h-[calc(100vh-200px)]` su mobile, usare `max-h-[60vh]`

#### 2. Azioni bulk su tavoli
**Files: `Tables.tsx`, `TableCanvas.tsx`**

Aggiungere al header della pagina:
- **"Svuota Tutti i Tavoli"** — elimina tutte le `table_assignments` del wedding, mantiene i tavoli
- **"Elimina Tutto"** — elimina tavoli + assignments (reset completo)

Aggiungere a ogni singolo tavolo (nel `DroppableTable`):
- **"Svuota Tavolo"** — rimuove tutti gli ospiti assegnati a quel tavolo
- **"Elimina Tavolo"** — elimina il tavolo e le sue assignments

Entrambe le azioni bulk richiedono un `AlertDialog` di conferma.

#### 3. Smart Planner potenziato con AI
**Files: `supabase/functions/smart-table-assigner/index.ts`, `SmartGrouperWizard.tsx`**

Il problema core: l'algoritmo usa solo `category`, `party_id`, `group_id` per calcolare affinità. Ma:
- Molti ospiti non hanno `category` compilata
- I cognomi (che indicano parentela) non vengono usati
- Le relazioni sociali implicite (stesso nucleo = stessa famiglia) non vengono sfruttate

**Soluzione: aggiungere un pre-processing AI** che, prima dell'algoritmo di assegnazione:

1. Chiama Lovable AI (Gemini Flash) con la lista ospiti e chiede di inferire **cluster di affinità** basandosi su:
   - Cognomi condivisi (famiglie)
   - Nuclei/party esistenti
   - Categorie (se presenti)
   - Nomi (per inferire età/generazione approssimativa)
2. L'AI restituisce un JSON strutturato con `affinity_pairs` (coppie di ospiti che dovrebbero stare vicini) e `suggested_categories` (per ospiti senza categoria)
3. Questi dati vengono iniettati nell'algoritmo esistente come pesi aggiuntivi

Questo trasforma il planner da "algoritmo a pesi statici" a "AI-assisted seating planner".

**Struttura della chiamata AI nell'edge function:**
```text
System: "Sei un wedding planner esperto. Analizza la lista ospiti e suggerisci affinità."
User: JSON con lista ospiti (nome, cognome, nucleo, categoria, gruppo)
Response (tool call): { affinity_pairs: [{id1, id2, score, reason}], category_suggestions: [{id, category}] }
```

### Dettagli tecnici

```text
Flusso Smart Planner dopo il fix:

1. Utente configura tavoli (step 1-3, invariato)
2. Click "Genera" → Edge Function riceve lista ospiti
3. [NUOVO] Edge Function chiama Lovable AI per inferire affinità
4. [NUOVO] Risultato AI viene fuso con pesi VIBE_WEIGHTS
5. Algoritmo di assegnazione gira con dati arricchiti
6. Risultato restituito al client (invariato)
```

### File da modificare

| File | Modifiche |
|---|---|
| `src/pages/Tables.tsx` | Layout responsive + azioni bulk (svuota/elimina) |
| `src/components/tables/TableCanvas.tsx` | Azioni per-tavolo (svuota/elimina singolo) + responsive |
| `src/components/tables/GuestPool.tsx` | Responsive mobile |
| `supabase/functions/smart-table-assigner/index.ts` | Integrazione Lovable AI per affinità intelligente |

