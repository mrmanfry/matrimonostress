

## Plan: Website Setup Wizard + Dynamic Prompt Engineering

### Overview
Replace the simple confirmation dialog with a multi-step wizard that collects style, tone, section, and RSVP preferences before generating a dynamic Lovable prompt.

### Files to modify/create

**1. `src/lib/generateLovableUrl.ts`** — Update:
- Add `WizardChoices` interface (`style`, `tone`, `sections: {story, dressCode, giftRegistry, logistics}`, `enableRsvp`)
- Rewrite `generateWeddingPrompt(data, choices)` to use dynamic style/tone, conditional sections, negative copywriting rules ("no cheesy quotes"), and conditional RSVP block
- Update `buildLovableUrl(data, choices)` signature to pass choices through

**2. `src/components/website/WebsiteSetupWizard.tsx`** — New component (Dialog-based):
- State: `WizardChoices` with defaults (`style: 'Classico ed Elegante'`, `tone: 'Sobrio e Formale'`, all sections off, `enableRsvp: true`)
- On open: fetch wedding data from Supabase (same query as current dialog)
- UI sections (all Italian):
  - **Stile Visivo**: 4 selectable cards/RadioGroup (Classico ed Elegante, Moderno e Minimalista, Romantico e Floreale, Rustico e Boho)
  - **Tono di Voce**: RadioGroup (Sobrio e Formale, Leggero e Divertente)
  - **Sezioni del Sito**: 4 Checkboxes (La Nostra Storia, Dress Code, Lista Nozze, Alloggi e Trasporti)
  - **RSVP**: Switch "Abilita ricezione RSVP dal sito web" (default ON)
  - Warning block (same Italian copy about redirect + Lovable account)
- Footer: "Annulla" + "Genera Sito Magico" button
- On submit: `buildLovableUrl(weddingData, choices)` → `window.open` synchronously → close dialog

**3. `src/components/website/WebsiteGeneratorCard.tsx`** — Update import:
- Replace `WebsiteGeneratorDialog` with `WebsiteSetupWizard`

**4. Delete or keep `WebsiteGeneratorDialog.tsx`** — No longer needed, replaced by wizard. Will keep file but stop importing it.

### Prompt template key changes
- Style mapped to design instructions (typography, color palette per style)
- Tone injected + strict "COPYWRITING RULES" block forbidding cheesy/cliché phrases
- Sections 3-6 conditionally included based on checkbox state
- RSVP section conditionally included based on switch; when off, explicit "Do NOT add RSVP"
- RSVP URL remains `https://matrimonostress.lovable.app/rsvp/${wedding_id}`

### No database changes needed

