

## Redesign Landing Page "/" in stile Auth

### Problema attuale
La landing page usa un'immagine AI (`hero-wedding.jpg`) di bassa qualita e uno stile visivo incoerente con la pagina `/auth`, che invece ha un design elegante con gradiente viola scuro, pattern astratti e tipografia pulita.

### Direzione visiva
Adottare lo stesso linguaggio della pagina `/auth`: sfondo con gradiente viola scuro (`hsl(250 40% 25%)` -> `hsl(270 35% 35%)`), cerchi decorativi semitrasparenti, dot pattern, testo bianco, e nessuna foto AI. Stile sofisticato, astratto, rassicurante.

### Struttura della nuova pagina

La pagina manterra le stesse sezioni ma con un restyling completo:

**1. Hero (riscrittura completa)**
- Eliminare `hero-wedding.jpg` completamente
- Sfondo: gradiente viola scuro full-screen (identico al pannello sinistro di `/auth`)
- Cerchi decorativi semitrasparenti + dot pattern sottile
- Logo "Nozze Senza Stress" in alto a sinistra
- Titolo grande in `font-serif` bianco, sottotitolo in `white/70`
- Feature pills (come in Auth: "Tesoreria smart", "Lista invitati", etc.)
- Due CTA: "Inizia Gratis" (bottone luminoso) + "Scopri Come Funziona" (outline bianco)
- Social proof in basso (avatar circolari + testo)

**2. ValueProposition - "4 Obiettivi Strategici"**
- Sfondo alternato: sezione chiara (invariata nella struttura)
- Aggiungere un accento viola/gradiente sottile alle card icon per coerenza
- Nessun cambiamento strutturale significativo

**3. ProblemStatement - "Il Problema Reale"**
- Invariato nella struttura, funziona gia bene
- Solo piccoli ritocchi cromatici per coerenza

**4. TargetAudience - "Per Chi"**
- Riscrittura: trasformare da "personas tecniche" a messaggio piu empatico
- Testo meno tecnico ("Project Manager, Marketing Specialist" non e il linguaggio giusto per coppie reali)
- Due card: "Organizzate tutto da soli" vs "Avete poco tempo" - piu accessibile

**5. HowItWorks - "Architettura"**
- Riscrittura: rinominare da "Architettura" a "Come Funziona" in 3 step semplici
- Eliminare terminologia tecnica (SPA, API, Database) e sostituire con benefici utente
- Step 1: "Crea il tuo spazio" - Step 2: "Organizza tutto" - Step 3: "Vivi sereno"

**6. TechStack - "Fondamenta Solide"**
- Semplificare: rimuovere dettagli tecnici (SPA, API, Database Professionale)
- Trasformare in sezione "Sicurezza e Affidabilita" con focus su benefici (dati protetti, sempre disponibile, backup automatici)
- Rimuovere il box "Tecnologia All'Avanguardia" troppo tecnico

**7. DeviceSupport**
- Semplificare: unire con la sezione precedente o ridurre a un banner compatto
- Rimuovere lista browser supportati (nessun utente finale la cerca)

**8. Footer**
- Aggiungere link utili (Privacy, Contatti, link a /auth)
- Piccolo ritocco stilistico

### File coinvolti

| File | Azione |
|------|--------|
| `src/components/Hero.tsx` | Riscrittura completa: rimuovere immagine, adottare stile Auth |
| `src/components/TargetAudience.tsx` | Riscrittura testi: linguaggio empatico, non tecnico |
| `src/components/HowItWorks.tsx` | Riscrittura: "Come Funziona" in 3 step utente |
| `src/components/TechStack.tsx` | Semplificare: focus sicurezza/affidabilita |
| `src/components/DeviceSupport.tsx` | Ridurre a banner compatto |
| `src/components/Footer.tsx` | Aggiungere link e piccoli ritocchi |
| `src/components/ValueProposition.tsx` | Ritocchi cromatici minori |
| `src/components/ProblemStatement.tsx` | Ritocchi cromatici minori |
| `src/pages/Index.tsx` | Possibile riordino sezioni |
| `src/assets/hero-wedding.jpg` | Da rimuovere (non piu referenziato) |

### Dettagli tecnici

L'Hero usera inline styles per il gradiente identici a quelli di Auth:
```text
background: linear-gradient(135deg, hsl(250 40% 25%), hsl(270 35% 35%), hsl(260 30% 20%))
```

Pattern decorativi identici: cerchi con `bg-white/5`, `bg-white/8`, `border-white/10`, dot pattern con `opacity-[0.03]`.

Nessuna nuova dipendenza richiesta. Nessuna modifica al database o backend.

