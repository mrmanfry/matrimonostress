
# FAQ: Migliora con AI per singola domanda

## Problema
Il bottone "Genera con AI" genera tutte le FAQ da zero. L'utente vuole anche poter scrivere una bozza di domanda/risposta e farsi riscrivere il testo in modo professionale dall'AI.

## Soluzione

Aggiungere un piccolo bottone "Migliora con AI" (icona Sparkles) su ogni singola FAQ card, accanto al bottone elimina. Quando cliccato:
- Prende la domanda e risposta abbozzate dall'utente
- Le invia a un endpoint AI che le riscrive in modo professionale, mantenendo il significato
- Sostituisce il testo con la versione migliorata

Il bottone "Genera con AI" in alto resta per generare FAQ da zero.

## Dettaglio Tecnico

### 1. Edge Function: estendere `generate-rsvp-faqs`

Aggiungere una modalita `mode: "polish"` all'edge function esistente:

- Se il body contiene `{ weddingId, mode: "polish", draft_question, draft_answer }`:
  - Usa un prompt diverso: "Riscrivi questa FAQ in modo professionale ed elegante per un sito di matrimonio. Mantieni il significato ma migliora tono, grammatica e completezza."
  - Ritorna una singola FAQ riscritta `{ question, answer }`
- Se il body contiene solo `{ weddingId }` (senza mode): comportamento attuale invariato (genera 5-6 FAQ)

### 2. Frontend: `CampaignConfigDialog.tsx`

- Aggiungere state `polishingIndex: number | null` per tracciare quale FAQ sta venendo migliorata
- Nuova funzione `handlePolishFaq(index)`:
  - Chiama l'edge function con `mode: "polish"` + domanda/risposta correnti
  - Aggiorna la FAQ all'indice specificato con il risultato
- Aggiungere un bottone icona `Sparkles` (piccolo, `size="icon"`) accanto al bottone Trash2 su ogni FAQ card
  - Disabilitato se domanda o risposta sono vuote
  - Mostra spinner durante il polish

### Layout aggiornato per ogni FAQ card:

```text
[Input: Domanda                              ]
[Textarea: Risposta                          ]
                                [Sparkles] [Trash]
```

### File coinvolti

| File | Modifica |
|---|---|
| `supabase/functions/generate-rsvp-faqs/index.ts` | Aggiungere modalita `polish` con prompt dedicato |
| `src/components/settings/CampaignConfigDialog.tsx` | Bottone "Migliora" per singola FAQ + handler |

Nessuna modifica al DB.
