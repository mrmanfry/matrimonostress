

## Plan: AI Wedding Website Generator

### What we're building
A client-side feature that compiles wedding data into a prompt, URL-encodes it, and redirects to `lovable.dev/?autosubmit=true#prompt=...` in a new tab. No backend changes needed.

### New files to create

**1. `src/lib/generateLovableUrl.ts`** — Utility with:
- `LOVABLE_BASE_URL` constant
- `generateWeddingPrompt(data)` — builds the prompt string, gracefully omitting missing fields (date, venue)
- `buildLovableUrl(data)` — returns the full URL with `encodeURIComponent(prompt)` and optional `images` param
- Data shape: `{ partner1_name, partner2_name, wedding_date?, ceremony_venue_name?, ceremony_venue_address?, reception_venue_name?, reception_venue_address?, wedding_id, cover_photo_url? }`
- RSVP link hardcoded to `https://matrimonostress.lovable.app/rsvp/${wedding_id}`

**2. `src/components/website/WebsiteGeneratorCard.tsx`** — Dashboard card:
- `Wand2` icon, title "Sito Web Magico con AI", description in Italian
- Button "Genera Sito Ora" that opens the dialog
- Renders `WebsiteGeneratorDialog` internally

**3. `src/components/website/WebsiteGeneratorDialog.tsx`** — Confirmation dialog:
- Receives `weddingId` as prop
- On open: fetches wedding data from Supabase (`partner1_name, partner2_name, wedding_date, ceremony_venue_name, ceremony_venue_address, reception_venue_name, reception_venue_address`)
- Italian copy explaining the redirect + Lovable account requirement + RSVP auto-link
- "Ho capito, andiamo!" button: calls `buildLovableUrl()` synchronously, `window.open(url, '_blank')`, closes dialog
- "Annulla" button to close

### Existing file to modify

**4. `src/pages/Dashboard.tsx`** — Add `<WebsiteGeneratorCard />` in the grid (line ~528, inside the `md:grid-cols-2` grid), passing `weddingId={wedding.id}`. Only visible for couple role (not collaborators/planners).

### Edge cases handled
- Missing date/venue: prompt omits those sections instead of printing "undefined"
- Special characters (accents, apostrophes): `encodeURIComponent` handles them
- Popup blockers: `window.open` called synchronously in click handler, no async wrapping
- No PII leaked: only names, date, venue, wedding_id in prompt

### No database changes needed
Everything is client-side. No migrations, no new tables.

