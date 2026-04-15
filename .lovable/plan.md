

## Piano: Help Portal WedsApp — Ispirato alla Documentazione Lovable

### Panoramica

Creeremo un Help Center completo con layout Mintlify/Lovable-style: sidebar di navigazione a sinistra con sezioni espandibili, contenuto principale al centro, e "On this page" (table of contents) a destra. Sarà accessibile sia pubblicamente (`/help`) che dall'interno dell'app (link nella sidebar).

### Struttura del Portale

```text
/help                         → Home con card overview
/help/:category/:article      → Articolo singolo

Categorie:
├── Primi Passi
│   ├── Registrazione e Login
│   ├── Onboarding e Creazione Matrimonio
│   └── Unirsi a un Matrimonio (Codice Accesso)
├── Dashboard
│   └── Panoramica e Widget
├── Invitati
│   ├── Aggiungere Invitati
│   ├── Import CSV e Smart Import
│   ├── Nuclei Familiari (Party)
│   ├── Gruppi e Filtri
│   ├── Contact Sync (QR)
│   └── Analisi e Funnel RSVP
├── Fornitori
│   ├── Gestione Fornitori
│   ├── Voci di Spesa e Piano Pagamenti
│   ├── Contratti e Documenti
│   └── Appuntamenti
├── Budget e Tesoreria
│   ├── Budget Spreadsheet
│   ├── Tesoreria e Flussi di Cassa
│   ├── Modalità Calcolo (Planned/Expected/Confirmed)
│   └── Contributori Finanziari
├── Checklist
│   ├── Gestione Task
│   ├── Priorità, Deleghe e Dipendenze
│   ├── Follow-Up e Promemoria
│   └── Esportazione PDF
├── Tavoli
│   ├── Creare e Assegnare Tavoli
│   ├── Drag & Drop e Conflitti
│   └── Smart Grouper (AI)
├── Catering
│   ├── Diete e Preferenze
│   ├── Menu Composer
│   └── Esportazione
├── Inviti e RSVP
│   ├── Campagne Save the Date
│   ├── Campagne RSVP
│   ├── Design Integrato
│   ├── Print Studio
│   └── Libretto Messa
├── Memories Reel
│   ├── Configurazione Camera
│   ├── Condivisione QR
│   ├── Moderazione e Gallery
│   └── Download e Upgrade
├── Alloggi
│   └── Gestione Hotel e Assegnazioni
├── Timeline
│   └── Programma del Giorno
├── Calendario
│   └── Vista Unificata
├── Chat e Collaborazione
│   ├── Chat Interna
│   ├── Ruoli e Permessi
│   └── Wedding Planner Mode
├── Impostazioni
│   ├── Dati Matrimonio
│   ├── Team e Inviti
│   └── Abbonamento
└── Sito Web del Matrimonio
    └── Generatore Sito
```

### Architettura Tecnica

**1) Dati degli articoli** — File statico `src/data/helpArticles.ts`
- Array di oggetti con `category`, `slug`, `title`, `description`, `content` (markdown-like JSX o stringhe con sezioni)
- Nessun database necessario: contenuto statico, facilmente manutenibile

**2) Componenti principali**
- `src/pages/HelpCenter.tsx` — Layout con sidebar + contenuto + TOC
- `src/pages/HelpArticle.tsx` — Pagina singolo articolo
- `src/components/help/HelpSidebar.tsx` — Navigazione laterale con categorie espandibili
- `src/components/help/HelpHome.tsx` — Grid di card per le categorie
- `src/components/help/HelpTableOfContents.tsx` — "On this page" a destra
- `src/components/help/HelpBreadcrumb.tsx` — Breadcrumb navigazione

**3) Routing**
- `<Route path="/help" element={<HelpCenter />} />`
- `<Route path="/help/:category" element={<HelpCenter />} />`
- `<Route path="/help/:category/:article" element={<HelpCenter />} />`
- Queste route saranno **pubbliche** (fuori da `/app`)
- Nella sidebar dell'app, un link "Guida" aprirà `/help` in un nuovo tab

**4) Design**
- Stile Lovable/Mintlify: sfondo pulito, tipografia chiara, sidebar con icone per categoria
- Responsive: su mobile la sidebar diventa un drawer/menu hamburger
- Breadcrumb in alto, titolo articolo prominente, sezioni con anchor link
- Card callout colorate per tip/warning (come i box verdi/gialli di Lovable docs)
- Coerente col design system WedsApp esistente (shadcn/ui)

**5) Contenuto degli articoli**
- Io conosco nel dettaglio ogni funzionalità dell'app, quindi scriverò contenuti accurati e completi per ogni sezione
- Ogni articolo avrà: titolo, descrizione breve, sezioni con heading, tip/callout box, e link correlati
- Circa 40-50 articoli totali che coprono l'intera app

### Fasi di Implementazione

| Fase | Descrizione |
|------|------------|
| 1 | Struttura routing, layout, sidebar, home con card |
| 2 | Componente articolo con TOC e breadcrumb |
| 3 | Data file con tutti i contenuti (batch da ~10 articoli per volta) |
| 4 | Link nella sidebar dell'app + stile responsive mobile |

### Note

- Nessuna ricerca o AI per ora — navigazione manuale tra sezioni
- Il contenuto sarà in italiano, coerente col tono dell'app
- Non servono modifiche al database
- I build errors attuali sono preesistenti e non correlati a questo lavoro

