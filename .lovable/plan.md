

## Piano: Miglioramenti pagina RSVP pubblica

### Cosa cambia

1. **Preferenze alimentari in un menu a tendina (collapsible)**
   - Attualmente le opzioni dietetiche (Vegetariano, Vegano, Celiaco, ecc.) sono sempre visibili come checkbox sotto ogni membro confermato.
   - Le trasformeremo in una sezione collapsibile con un bottone "Preferenze alimentari" che l'ospite apre solo se serve. Le checkbox restano identiche, ma nascoste dentro un `Collapsible` o `details/summary`.

2. **Rimuovere la freccia lampeggiante (bounce chevron)**
   - La `<ChevronDown>` con `animate-bounce` nella hero section (riga ~342 di `FormalInviteView.tsx`) verrà eliminata. Stessa cosa in `SaveTheDateView.tsx` se presente.

3. **Fix immagine hero su mobile**
   - Il problema è `backgroundAttachment: 'fixed'` (riga ~302) che su iOS/mobile causa zoom e rendering anomalo. Verrà rimosso su mobile usando `background-attachment: scroll` e aggiungendo `background-position: center center` con `background-size: cover` senza `fixed`.

### Dettagli tecnici

**File: `src/components/rsvp/FormalInviteView.tsx`**
- Righe ~576-643: wrappare le checkbox dietetiche e il campo allergie in un `Collapsible` (da shadcn) con trigger "Preferenze alimentari ▾". Stesso trattamento per il plus-one dietary (righe ~670-698).
- Righe ~341-344: rimuovere il div `animate-bounce` con `ChevronDown`.
- Righe ~296-303: rimuovere `backgroundAttachment: 'fixed'` dalla hero section. Applicare la stessa fix alla success view (righe ~222-228).

**File: `src/components/rsvp/SaveTheDateView.tsx`**
- Rimuovere `backgroundAttachment: 'fixed'` dalle sezioni hero (righe ~369-372 e ~229-232).
- Rimuovere eventuale chevron animata se presente.

