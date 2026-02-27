

## Rebranding: "Nozze Senza Stress" -> "WedsApp"

Sostituzione di tutti i riferimenti al vecchio nome in 14 file, sia frontend che backend (edge functions) e metadati HTML.

### File da modificare

**Frontend (src/)**

| File | Occorrenze | Note |
|------|-----------|------|
| `src/components/Hero.tsx` | 1 | Logo in alto a sinistra |
| `src/components/Footer.tsx` | 2 | Logo + copyright |
| `src/components/ProblemStatement.tsx` | 1 | Testo corpo |
| `src/components/TargetAudience.tsx` | 1 | Testo corpo |
| `src/pages/Auth.tsx` | 2 | Pannello sinistro (logo) + form (titolo) |
| `src/pages/AppLayout.tsx` | 1 | Sidebar logo |
| `src/pages/TimelinePublic.tsx` | 1 | Footer pagina pubblica |
| `src/pages/ProgressPublic.tsx` | 1 | Footer pagina pubblica |
| `src/utils/pdfHelpers.ts` | 1 | Footer PDF catering |
| `src/utils/checklistPdfExport.ts` | 1 | Footer PDF checklist |

**Backend (supabase/functions/)**

| File | Occorrenze | Note |
|------|-----------|------|
| `supabase/functions/send-welcome-email/index.ts` | ~4 | Titolo, footer, mittente email |
| `supabase/functions/check-payment-reminders/index.ts` | ~3 | Titolo, footer, mittente email |
| `supabase/functions/check-trial-reminders/index.ts` | ~2 | Footer, mittente email |

**Metadati**

| File | Occorrenze | Note |
|------|-----------|------|
| `index.html` | 1 | meta author |

### Tipo di modifica

Semplice find-and-replace testuale: ogni occorrenza di "Nozze Senza Stress" diventa "WedsApp". Nessuna modifica strutturale, nessuna nuova dipendenza, nessuna modifica al database.

Totale: ~21 sostituzioni in 14 file.

