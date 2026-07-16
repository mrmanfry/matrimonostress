## Obiettivo

1. Togliere il "muro rosso" dalla vista fornitori (`/progress/:token` con audience=vendor): oggi è tutto gradienti rose/purple → trasmette ansia. La rendiamo sobria, in linea con il resto di WedsApp ("calma e controllo").
2. Aggiungere i **recapiti dei fornitori** (nome fornitore + categoria + telefono + email) nella stessa pagina, protetti da:
   - un pulsante **"Mostra contatti"** (rivelazione esplicita, non stampabili di default);
   - **`<meta name="robots" content="noindex, nofollow">`** sulla pagina pubblica → non indicizzabile da Google;
   - render dei numeri lato client solo dopo click (nel markup iniziale non ci sono → gli scraper base non li trovano);
   - gating sul flag esistente `show_vendor_contacts` del token (chi non lo abilita non li vede proprio).

---

## A. Restyle vista fornitori — palette calma

`src/components/progress/VendorsProgressView.tsx`:

- Sfondo: da `bg-gradient-to-br from-rose-50 via-white to-purple-50` → `bg-background` con un pannello card `bg-card` centrato (stesso linguaggio della vista ospiti).
- Header: rimuovo il gradiente rose/purple e l'aura colorata. Nomi in serif (token `font-serif` del progetto), data in italiano, badge sobrio "Briefing fornitori" con `bg-muted text-muted-foreground`.
- Accenti: **niente più rose-500 ovunque**. Uso i token semantici `primary` / `accent` (già definiti in `index.css`) al posto di `text-rose-500`, `bg-rose-500`, `border-rose-100`, `from-rose-50 to-purple-50`.
- Card numeri operativi: bordo sottile `border-border`, sfondo `bg-card`, il "Totale coperti" evidenziato con `bg-primary/5 border-primary/20` (non più gradiente pieno colorato).
- Timeline: pallini/linee in `bg-primary` (che nel design system è il colore neutro-elegante), orari in mono, testo in `text-foreground`.
- Indirizzi: card `bg-muted/40 hover:bg-muted` con freccia → link Google Maps.
- Note logistiche: mantengo l'`amber` (unico accento "attenzione" giustificato) ma più tenue.

Risultato: stessa struttura informativa, tono elegante e riposante — coerente con la vista ospiti e con il resto dell'app.

## B. Sezione "Contatti fornitori" nascosta

Nuova card nella vista fornitori (visibile solo se `tokenRow.show_vendor_contacts = true`):

```
┌ Rubrica fornitori ─────────────────────────┐
│ 12 fornitori confermati per l'evento.      │
│                                            │
│ [ 👁  Mostra contatti ]                    │
└────────────────────────────────────────────┘
```

Dopo il click:

```
┌ Rubrica fornitori ─────────────────────────┐
│ Catering · Villa Rosa                      │
│   📞 +39 333 …    ✉ info@villarosa.it      │
│ ──────────────────────────────────────────  │
│ Fotografo · Marco Bianchi                  │
│   📞 +39 340 …                             │
│ …                                          │
│                                            │
│ ⚠ Non condividere questi recapiti.        │
└────────────────────────────────────────────┘
```

Note UX:
- I contatti sono renderizzati **solo dopo click** (state `revealed`), quindi non presenti nell'HTML iniziale.
- Numeri e email sono `tel:` / `mailto:` cliccabili.
- Nessun pulsante "stampa/esporta" per non incentivare la diffusione.

## C. Estensione edge function `progress-public-data`

Aggiungo al payload (solo se `tok.show_vendor_contacts = true`) un nuovo array `vendorContacts`:

```ts
{
  category: string | null,
  name: string,           // company_name o contact_name
  phone: string | null,
  email: string | null,
}[]
```

Fetch da `vendors` filtrato per `wedding_id` e stato "confermato/prenotato" (uso lo stesso criterio già in vigore in `Vendors.tsx` — verifico il campo esatto prima dell'implementazione, tipicamente `status IN ('booked','confirmed')`). Nessun costo, indirizzo IBAN o dato finanziario nel payload.

## D. Anti-indicizzazione della pagina pubblica

In `src/pages/ProgressPublic.tsx`:

- Setto dinamicamente in `<head>`:
  - `<meta name="robots" content="noindex, nofollow, noarchive">`
  - `<meta name="googlebot" content="noindex, nofollow">`
- Rimuovo/evito qualsiasi `og:` che possa esporre dati sensibili nel preview link (title generico "Briefing evento", nessuna descrizione con nomi).
- Aggiungo `Referrer-Policy: no-referrer` via meta.

E aggiorno `public/robots.txt` con:
```
User-agent: *
Disallow: /progress/
```

Combinazione: motori di ricerca non lo indicizzano, e anche se qualcuno condivide il link, i numeri di telefono non sono nel markup finché non si clicca "Mostra".

## E. File toccati

- `src/components/progress/VendorsProgressView.tsx` — restyle completo + nuova card "Rubrica fornitori" con reveal
- `supabase/functions/progress-public-data/index.ts` — aggiunta `vendorContacts` gated sul flag
- `src/pages/ProgressPublic.tsx` — meta robots/referrer + title neutro
- `public/robots.txt` — disallow `/progress/`

Nessuna migration necessaria: il flag `show_vendor_contacts` esiste già sulla tabella `progress_tokens`.

---

## Domanda aperta

Il flag `show_vendor_contacts` oggi controlla i **contatti della coppia/planner**. Due opzioni:

1. **Riuso lo stesso flag** anche per la rubrica fornitori (semplice, un solo toggle nel dialog di condivisione).
2. **Aggiungo un flag separato** `show_vendor_directory` così la coppia può decidere indipendentemente (più granulare, richiede una piccola migration + UI nel `ShareProgressDialog`).

Di default vado con l'**opzione 1** (semplicità e coerenza); dimmi se preferisci la 2 e la includo.
