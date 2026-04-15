import {
  Rocket, Users, Store, Wallet, CheckSquare, LayoutGrid,
  ChefHat, Send, Camera, Hotel, Clock, CalendarDays,
  MessageCircle, Settings, Globe, LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface HelpSection {
  id: string;
  title: string;
  content: string; // HTML
}

export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  sections: HelpSection[];
  relatedArticles?: string[]; // slugs in format "category/article"
}

export interface HelpCategory {
  slug: string;
  title: string;
  icon: LucideIcon;
  description: string;
  articles: HelpArticle[];
}

export const helpCategories: HelpCategory[] = [
  {
    slug: "primi-passi",
    title: "Primi Passi",
    icon: Rocket,
    description: "Registrazione, onboarding e configurazione iniziale del tuo matrimonio.",
    articles: [
      {
        slug: "registrazione-e-login",
        title: "Registrazione e Login",
        description: "Come creare il tuo account WedsApp e accedere all'app.",
        sections: [
          {
            id: "creare-account",
            title: "Creare un Account",
            content: `<p>Per iniziare ad usare WedsApp, visita la pagina di registrazione e inserisci il tuo indirizzo email e una password sicura.</p>
<p>Puoi anche registrarti rapidamente usando il tuo <strong>account Google</strong> per un accesso immediato senza dover ricordare un'altra password.</p>
<div class="help-callout help-callout-info">
<strong>💡 Suggerimento</strong><br/>
Usa un'email che controlli regolarmente: riceverai notifiche importanti come promemoria di pagamento e aggiornamenti RSVP.
</div>`
          },
          {
            id: "conferma-email",
            title: "Conferma Email",
            content: `<p>Dopo la registrazione, riceverai un'email di conferma. Clicca sul link contenuto per attivare il tuo account.</p>
<div class="help-callout help-callout-warning">
<strong>⚠️ Importante</strong><br/>
Controlla anche la cartella spam se non trovi l'email entro qualche minuto.
</div>`
          },
          {
            id: "accesso",
            title: "Accedere all'App",
            content: `<p>Una volta confermato l'account, accedi dalla pagina di login con email e password oppure con Google.</p>
<p>Se hai dimenticato la password, usa il link <strong>"Password dimenticata?"</strong> per ricevere un'email di recupero.</p>`
          }
        ]
      },
      {
        slug: "onboarding",
        title: "Onboarding e Creazione Matrimonio",
        description: "Come configurare il tuo matrimonio durante il primo accesso.",
        sections: [
          {
            id: "scelta-ruolo",
            title: "Scelta del Ruolo",
            content: `<p>Al primo accesso, ti verrà chiesto di scegliere il tuo ruolo:</p>
<ul>
<li><strong>Sposo/a</strong> — Stai organizzando il tuo matrimonio</li>
<li><strong>Wedding Planner</strong> — Sei un professionista che organizza matrimoni per i clienti</li>
<li><strong>Ho un codice di accesso</strong> — Sei stato invitato a collaborare a un matrimonio esistente</li>
</ul>`
          },
          {
            id: "dati-matrimonio",
            title: "Inserire i Dati del Matrimonio",
            content: `<p>Se sei uno sposo/a, dovrai inserire:</p>
<ul>
<li>I <strong>nomi dei partner</strong> (Partner 1 e Partner 2)</li>
<li>La <strong>data del matrimonio</strong> (puoi segnarla come "tentativa" se non è ancora confermata)</li>
<li>Il <strong>luogo</strong> della cerimonia e/o del ricevimento</li>
</ul>
<div class="help-callout help-callout-info">
<strong>💡 Suggerimento</strong><br/>
Puoi modificare tutti questi dati in qualsiasi momento dalla sezione Impostazioni.
</div>`
          },
          {
            id: "dashboard",
            title: "Atterraggio sulla Dashboard",
            content: `<p>Completato l'onboarding, verrai reindirizzato alla <strong>Dashboard</strong>, il centro di controllo del tuo matrimonio. Da qui puoi accedere rapidamente a tutte le sezioni dell'app.</p>`
          }
        ]
      },
      {
        slug: "unirsi-a-matrimonio",
        title: "Unirsi a un Matrimonio",
        description: "Come entrare in un matrimonio esistente usando un codice di accesso.",
        sections: [
          {
            id: "codice-accesso",
            title: "Codice di Accesso",
            content: `<p>Se qualcuno ti ha invitato a collaborare al suo matrimonio, ti avrà fornito un <strong>codice di accesso alfanumerico</strong>.</p>
<p>Durante l'onboarding, seleziona "Ho un codice di accesso" e inseriscilo nel campo dedicato.</p>`
          },
          {
            id: "ruoli-collaboratore",
            title: "Ruoli del Collaboratore",
            content: `<p>Una volta entrato, il tuo ruolo e i tuoi permessi sono definiti da chi ti ha invitato. Potresti avere accesso in:</p>
<ul>
<li><strong>Visualizzazione</strong> — Puoi solo consultare i dati</li>
<li><strong>Modifica</strong> — Puoi modificare dati esistenti</li>
<li><strong>Creazione</strong> — Puoi aggiungere nuovi elementi</li>
</ul>
<p>I permessi sono configurabili per ogni area dell'app (Invitati, Budget, Checklist, ecc.).</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    description: "Il centro di controllo del tuo matrimonio con widget e contatori.",
    articles: [
      {
        slug: "panoramica-widget",
        title: "Panoramica e Widget",
        description: "Tutti i widget della dashboard e come interpretarli.",
        sections: [
          {
            id: "countdown",
            title: "Countdown",
            content: `<p>Il widget del countdown mostra i <strong>giorni mancanti</strong> al tuo matrimonio. Se la data è segnata come "tentativa", vedrai un'indicazione apposita.</p>`
          },
          {
            id: "riepilogo-invitati",
            title: "Riepilogo Invitati",
            content: `<p>Un widget riassuntivo che mostra a colpo d'occhio:</p>
<ul>
<li>Totale invitati</li>
<li>Confermati</li>
<li>In attesa</li>
<li>Declinati</li>
</ul>
<p>Cliccando sul widget, accedi direttamente alla sezione Invitati.</p>`
          },
          {
            id: "prossime-scadenze",
            title: "Prossime Scadenze",
            content: `<p>Mostra le prossime scadenze dalla checklist e i prossimi pagamenti. È il tuo "radar" per non dimenticare nulla.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "invitati",
    title: "Invitati",
    icon: Users,
    description: "Gestione completa della lista invitati, nuclei familiari, gruppi e RSVP.",
    articles: [
      {
        slug: "aggiungere-invitati",
        title: "Aggiungere Invitati",
        description: "Come aggiungere invitati uno per uno o in blocco.",
        sections: [
          {
            id: "aggiunta-manuale",
            title: "Aggiunta Manuale",
            content: `<p>Clicca su <strong>"+ Aggiungi Invitato"</strong> per aprire il form di creazione. I campi obbligatori sono:</p>
<ul>
<li><strong>Nome</strong> e <strong>Cognome</strong></li>
</ul>
<p>I campi opzionali includono: telefono, gruppo, categoria, note, restrizioni alimentari e se è un bambino.</p>`
          },
          {
            id: "smart-import",
            title: "Smart Import (AI)",
            content: `<p>Lo <strong>Smart Import</strong> è uno strumento potentissimo che usa l'intelligenza artificiale per importare invitati da testo libero.</p>
<p>Puoi incollare una lista copiata da WhatsApp, email, note — in qualsiasi formato. L'AI riconoscerà automaticamente nomi, cognomi, numeri di telefono e raggrupperà le famiglie.</p>
<div class="help-callout help-callout-info">
<strong>💡 Suggerimento</strong><br/>
Funziona anche con formati come "Famiglia Rossi: Mario, Anna e i piccoli Luca e Sara" — l'AI capisce il contesto e crea il nucleo familiare con i bambini contrassegnati.
</div>`
          },
          {
            id: "import-csv",
            title: "Import da CSV",
            content: `<p>Se hai già una lista in Excel o Google Sheets, puoi esportarla come CSV e importarla in WedsApp.</p>
<p>Il sistema mapperà automaticamente le colonne riconosciute (Nome, Cognome, Telefono, Gruppo) e ti mostrerà un'anteprima prima di confermare.</p>`
          }
        ]
      },
      {
        slug: "nuclei-familiari",
        title: "Nuclei Familiari (Party)",
        description: "Come raggruppare gli invitati in nuclei per gestire inviti e RSVP.",
        sections: [
          {
            id: "cos-e-nucleo",
            title: "Cos'è un Nucleo",
            content: `<p>Un <strong>nucleo familiare</strong> (o "party") è un gruppo di invitati che condividono lo stesso invito. Ad esempio:</p>
<ul>
<li>"Famiglia Rossi" — Mario, Anna e i figli</li>
<li>"Marco e Giulia" — una coppia</li>
<li>"Alessandra" — un invitato singolo</li>
</ul>
<p>Il nucleo è l'unità base per l'invio di RSVP, Save the Date e partecipazioni stampate.</p>`
          },
          {
            id: "creare-nucleo",
            title: "Creare e Gestire Nuclei",
            content: `<p>Puoi creare un nucleo in diversi modi:</p>
<ul>
<li>Dalla <strong>card dell'invitato</strong>, cliccando "Crea nucleo"</li>
<li>Selezionando più invitati e usando la <strong>toolbar di selezione</strong> → "Raggruppa in nucleo"</li>
<li>Automaticamente durante l'<strong>import CSV o Smart Import</strong></li>
</ul>
<p>Ogni nucleo ha un <strong>nome</strong> che puoi personalizzare liberamente (es. "Stefania, Angelo e Roberto").</p>
<div class="help-callout help-callout-info">
<strong>💡 Suggerimento</strong><br/>
Il nome del nucleo viene usato come "intestazione" nelle partecipazioni e negli inviti RSVP. Personalizzalo come vuoi che appaia sull'invito!
</div>`
          },
          {
            id: "nucleo-rsvp",
            title: "Nucleo e RSVP",
            content: `<p>Quando invii un RSVP, viene inviato <strong>al nucleo</strong>, non al singolo invitato. Tutti i membri del nucleo possono confermare la partecipazione in un'unica sessione.</p>
<p>Il sistema tiene traccia di chi ha risposto e quando, nel log RSVP.</p>`
          }
        ]
      },
      {
        slug: "gruppi-e-filtri",
        title: "Gruppi e Filtri",
        description: "Come organizzare gli invitati in gruppi e usare i filtri avanzati.",
        sections: [
          {
            id: "gruppi",
            title: "Gruppi",
            content: `<p>I <strong>gruppi</strong> sono etichette che puoi assegnare agli invitati per organizzarli (es. "Amici sposa", "Colleghi", "Famiglia sposo").</p>
<p>Puoi creare nuovi gruppi al volo durante l'aggiunta di un invitato o dalla gestione gruppi dedicata.</p>`
          },
          {
            id: "filtri",
            title: "Filtri Avanzati",
            content: `<p>La barra dei filtri permette di filtrare per:</p>
<ul>
<li><strong>Stato RSVP</strong> — Confermati, In attesa, Declinati</li>
<li><strong>Gruppo</strong> — Qualsiasi gruppo creato</li>
<li><strong>Categoria</strong> — Classificazione personalizzata</li>
<li><strong>Bambini</strong> — Mostra solo adulti o solo bambini</li>
<li><strong>Dieta</strong> — Filtra per restrizioni alimentari</li>
</ul>`
          }
        ]
      },
      {
        slug: "contact-sync",
        title: "Contact Sync (QR)",
        description: "Come importare contatti dal telefono tramite QR code.",
        sections: [
          {
            id: "come-funziona",
            title: "Come Funziona",
            content: `<p>Il <strong>Contact Sync</strong> ti permette di importare i numeri di telefono direttamente dalla rubrica del tuo smartphone e abbinarli agli invitati già presenti nella lista.</p>
<ol>
<li>Genera un <strong>QR code</strong> dalla sezione Invitati</li>
<li>Scansiona il QR con il tuo telefono</li>
<li>Seleziona i contatti dalla rubrica usando il <strong>Contact Picker</strong> nativo</li>
<li>L'app abbina automaticamente i contatti agli invitati per nome</li>
</ol>`
          },
          {
            id: "matching",
            title: "Matching Intelligente",
            content: `<p>Il sistema usa un algoritmo di matching fuzzy per abbinare i contatti del telefono agli invitati nella lista, anche se i nomi non sono identici (es. "Giò" → "Giovanni").</p>
<p>Puoi rivedere e confermare ogni abbinamento prima di salvare.</p>`
          }
        ]
      },
      {
        slug: "analisi-funnel",
        title: "Analisi e Funnel RSVP",
        description: "Dashboard analitica con funnel e statistiche sugli invitati.",
        sections: [
          {
            id: "funnel",
            title: "Funnel RSVP",
            content: `<p>Il <strong>funnel RSVP</strong> visualizza lo stato di avanzamento dell'invio e delle risposte in fasi progressive:</p>
<ul>
<li><strong>Da lavorare</strong> — Invitati non ancora inseriti in un nucleo</li>
<li><strong>Pronti</strong> — In un nucleo, pronti per l'invio</li>
<li><strong>Inviati</strong> — RSVP inviato, in attesa di risposta</li>
<li><strong>Confermati</strong> — Hanno confermato la partecipazione</li>
<li><strong>Declinati</strong> — Non parteciperanno</li>
</ul>`
          },
          {
            id: "grafici",
            title: "Grafici e Statistiche",
            content: `<p>La sezione analitica mostra grafici a torta e barre per distribuzione per gruppo, stato RSVP, diete e conteggi adulti/bambini.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "fornitori",
    title: "Fornitori",
    icon: Store,
    description: "Gestione fornitori, preventivi, contratti, pagamenti e appuntamenti.",
    articles: [
      {
        slug: "gestione-fornitori",
        title: "Gestione Fornitori",
        description: "Come aggiungere e gestire i fornitori del matrimonio.",
        sections: [
          {
            id: "aggiungere-fornitore",
            title: "Aggiungere un Fornitore",
            content: `<p>Dalla sezione <strong>Fornitori</strong>, clicca su "Aggiungi Fornitore" per creare una nuova scheda. I campi principali sono:</p>
<ul>
<li><strong>Nome</strong> del fornitore</li>
<li><strong>Categoria</strong> (Fotografo, Catering, Location, Fiorista, ecc.)</li>
<li><strong>Contatto</strong>, email, telefono</li>
<li><strong>Stato</strong> — Contattato, Preventivo ricevuto, Confermato, Scartato</li>
</ul>`
          },
          {
            id: "scheda-360",
            title: "Scheda 360° del Fornitore",
            content: `<p>Ogni fornitore ha una pagina dedicata (<strong>Vendor Hub</strong>) con tutto ciò che lo riguarda:</p>
<ul>
<li>📋 <strong>Voci di spesa</strong> — Il dettaglio del preventivo/contratto</li>
<li>💳 <strong>Piano pagamenti</strong> — Scadenze e rate</li>
<li>📄 <strong>Documenti e contratti</strong> — Upload e analisi AI</li>
<li>📅 <strong>Appuntamenti</strong> — Visite, tasting, prove</li>
<li>✅ <strong>Checklist</strong> — Task collegate al fornitore</li>
</ul>`
          }
        ]
      },
      {
        slug: "voci-di-spesa",
        title: "Voci di Spesa e Piano Pagamenti",
        description: "Come gestire preventivi, contratti e piani di pagamento.",
        sections: [
          {
            id: "voci-spesa",
            title: "Voci di Spesa",
            content: `<p>Ogni fornitore può avere più <strong>voci di spesa</strong> che rappresentano le singole voci del preventivo o contratto.</p>
<p>Per ogni voce puoi specificare:</p>
<ul>
<li>Descrizione</li>
<li>Importo (stimato o effettivo)</li>
<li>Tipo di calcolo: <strong>Fisso</strong> o <strong>Per persona</strong> (adulti/bambini/staff)</li>
<li>IVA (inclusa o esclusa, con aliquota personalizzabile)</li>
</ul>
<div class="help-callout help-callout-info">
<strong>💡 Suggerimento</strong><br/>
Le voci "Per persona" si aggiornano automaticamente al variare del numero di invitati confermati, dandoti sempre un'idea realistica del costo finale.
</div>`
          },
          {
            id: "piano-pagamenti",
            title: "Piano Pagamenti",
            content: `<p>Il <strong>piano pagamenti</strong> definisce come e quando pagherai il fornitore. Puoi creare rate con:</p>
<ul>
<li>Importo fisso o <strong>percentuale</strong> del totale contratto</li>
<li>Data di scadenza fissa o <strong>relativa</strong> al giorno del matrimonio (es. "30 giorni prima")</li>
<li>Possibilità di segnare il pagamento come <strong>"Effettuato"</strong></li>
</ul>
<p>I pagamenti alimentano automaticamente la <strong>Tesoreria</strong>, creando il grafico dei flussi di cassa.</p>`
          }
        ]
      },
      {
        slug: "contratti-documenti",
        title: "Contratti e Documenti",
        description: "Come caricare contratti e farli analizzare dall'AI.",
        sections: [
          {
            id: "upload",
            title: "Caricare Documenti",
            content: `<p>Dalla scheda del fornitore, puoi caricare contratti e documenti (PDF, immagini). Ogni file viene archiviato in modo sicuro e associato al fornitore.</p>`
          },
          {
            id: "analisi-ai",
            title: "Analisi AI del Contratto",
            content: `<p>Dopo il caricamento, puoi attivare l'<strong>analisi AI</strong> che estrae automaticamente:</p>
<ul>
<li>Importo totale del contratto</li>
<li>Date e scadenze</li>
<li>Clausole importanti</li>
<li>Penali e condizioni di cancellazione</li>
</ul>
<div class="help-callout help-callout-warning">
<strong>⚠️ Nota</strong><br/>
L'analisi AI è un supporto: verifica sempre i dati estratti con il documento originale.
</div>`
          }
        ]
      },
      {
        slug: "appuntamenti",
        title: "Appuntamenti",
        description: "Come gestire visite, tasting e prove con i fornitori.",
        sections: [
          {
            id: "creare-appuntamento",
            title: "Creare un Appuntamento",
            content: `<p>Dalla scheda del fornitore, puoi aggiungere appuntamenti con data, ora, luogo e note.</p>
<p>Gli appuntamenti appaiono nel <strong>Calendario unificato</strong> dell'app e puoi ricevere <strong>promemoria email</strong> automatici il giorno prima.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "budget-tesoreria",
    title: "Budget e Tesoreria",
    icon: Wallet,
    description: "Gestione finanziaria completa: budget, flussi di cassa e contributori.",
    articles: [
      {
        slug: "budget-spreadsheet",
        title: "Budget Spreadsheet",
        description: "La vista a foglio di calcolo per il budget complessivo.",
        sections: [
          {
            id: "panoramica",
            title: "Panoramica",
            content: `<p>Il <strong>Budget</strong> è una vista a foglio di calcolo che aggrega tutte le voci di spesa da tutti i fornitori, organizzate per categoria.</p>
<p>Ogni riga mostra:</p>
<ul>
<li>Fornitore e descrizione</li>
<li>Importo (stimato/effettivo)</li>
<li>Pagato finora</li>
<li>Residuo</li>
</ul>`
          },
          {
            id: "categorie",
            title: "Categorie di Spesa",
            content: `<p>Puoi creare categorie personalizzate (Catering, Fotografia, Location, Fiori, ecc.) per organizzare il budget. Ogni voce di spesa è collegata a una categoria.</p>`
          }
        ]
      },
      {
        slug: "tesoreria",
        title: "Tesoreria e Flussi di Cassa",
        description: "La killer feature: il cruscotto finanziario con timeline dei pagamenti.",
        sections: [
          {
            id: "orizzonte-liquidita",
            title: "Orizzonte Liquidità",
            content: `<p>La <strong>Tesoreria</strong> è il cuore finanziario di WedsApp. Non è un semplice budget — è un vero <strong>cruscotto di tesoreria</strong> che risponde alla domanda: "Quando devo pagare e quanto?".</p>
<p>Comprende tre elementi chiave:</p>
<ol>
<li><strong>KPI Finanziari</strong> — Mese più intenso, prossima scadenza, totale impegnato vs pagato</li>
<li><strong>Grafico di Esborso Cumulativo</strong> — Un grafico a gradini che mostra l'andamento dei pagamenti nel tempo</li>
<li><strong>Lista Flussi</strong> — L'elenco cronologico di tutti i pagamenti futuri, azionabile</li>
</ol>`
          },
          {
            id: "flussi-azionabili",
            title: "Flussi Azionabili",
            content: `<p>Ogni flusso nella lista è <strong>azionabile</strong>:</p>
<ul>
<li>Clicca sul <strong>nome del fornitore</strong> per aprire la sua scheda</li>
<li>Usa il pulsante <strong>"Segna come pagato"</strong> per registrare il pagamento</li>
<li>Specifica la data effettiva di pagamento e chi ha pagato (tra i contributori)</li>
</ul>
<div class="help-callout help-callout-info">
<strong>💡 Suggerimento</strong><br/>
La Tesoreria si alimenta automaticamente dal Piano Pagamenti di ogni fornitore. Non devi inserire i dati due volte!
</div>`
          }
        ]
      },
      {
        slug: "modalita-calcolo",
        title: "Modalità di Calcolo",
        description: "Planned, Expected, Confirmed: le tre lenti per il budget.",
        sections: [
          {
            id: "tre-modalita",
            title: "Le Tre Modalità",
            content: `<p>WedsApp offre tre modalità di calcolo per le voci "per persona", ognuna con un significato diverso:</p>
<ul>
<li><strong>Planned</strong> — Basato sul numero di invitati previsto (totale lista)</li>
<li><strong>Expected</strong> — Basato sugli invitati che probabilmente verranno (esclusi i declinati)</li>
<li><strong>Confirmed</strong> — Basato solo sugli invitati che hanno effettivamente confermato</li>
</ul>
<p>Puoi passare da una modalità all'altra con un toggle globale. L'intero budget si ricalcola istantaneamente.</p>`
          }
        ]
      },
      {
        slug: "contributori",
        title: "Contributori Finanziari",
        description: "Gestire chi paga cosa: genitori, sposi e altri contributori.",
        sections: [
          {
            id: "aggiungere-contributori",
            title: "Aggiungere Contributori",
            content: `<p>Puoi aggiungere più <strong>contributori finanziari</strong> (es. Sposi, Genitori sposa, Genitori sposo) e assegnare ciascun pagamento a chi lo effettuerà.</p>
<p>Questo ti permette di sapere esattamente <strong>chi deve pagare cosa e quando</strong>.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "checklist",
    title: "Checklist",
    icon: CheckSquare,
    description: "Task, priorità, deleghe, dipendenze e promemoria automatici.",
    articles: [
      {
        slug: "gestione-task",
        title: "Gestione Task",
        description: "Come creare e gestire le attività per l'organizzazione del matrimonio.",
        sections: [
          {
            id: "creare-task",
            title: "Creare un Task",
            content: `<p>Clicca su <strong>"+ Nuovo Task"</strong> per aggiungere un'attività. Ogni task ha:</p>
<ul>
<li><strong>Titolo</strong> e descrizione</li>
<li><strong>Scadenza</strong></li>
<li><strong>Priorità</strong> — Bassa, Media, Alta, Urgente</li>
<li><strong>Categoria</strong> — Per organizzare i task per area</li>
<li><strong>Fornitore collegato</strong> — Link diretto alla scheda fornitore</li>
</ul>`
          },
          {
            id: "viste",
            title: "Viste",
            content: `<p>La checklist offre due viste:</p>
<ul>
<li><strong>Lista</strong> — Vista classica raggruppata per categoria</li>
<li><strong>Calendario</strong> — Vista mensile con i task posizionati sulle date di scadenza</li>
</ul>`
          },
          {
            id: "template",
            title: "Template Predefiniti",
            content: `<p>Al primo utilizzo, puoi caricare un <strong>template di checklist</strong> con le attività più comuni per l'organizzazione di un matrimonio, già organizzate per categoria e con scadenze relative alla data del matrimonio.</p>`
          }
        ]
      },
      {
        slug: "priorita-deleghe",
        title: "Priorità, Deleghe e Dipendenze",
        description: "Funzionalità avanzate per organizzare il lavoro in team.",
        sections: [
          {
            id: "priorita",
            title: "Priorità",
            content: `<p>Ogni task ha un livello di priorità visualizzato con un <strong>badge colorato</strong>:</p>
<ul>
<li>🟢 <strong>Bassa</strong></li>
<li>🟡 <strong>Media</strong></li>
<li>🟠 <strong>Alta</strong></li>
<li>🔴 <strong>Urgente</strong></li>
</ul>`
          },
          {
            id: "deleghe",
            title: "Deleghe",
            content: `<p>Puoi <strong>delegare</strong> un task a un collaboratore (partner, wedding planner, genitore). Il delegato riceverà una notifica e il task apparirà nella sua vista.</p>`
          },
          {
            id: "dipendenze",
            title: "Dipendenze tra Task",
            content: `<p>Puoi impostare <strong>dipendenze</strong>: un task può essere "bloccato" da un altro. Finché il task bloccante non è completato, quello dipendente mostrerà un avviso.</p>
<div class="help-callout help-callout-info">
<strong>💡 Suggerimento</strong><br/>
Esempio: "Inviare le partecipazioni" è bloccato da "Finalizzare la lista invitati".
</div>`
          }
        ]
      },
      {
        slug: "follow-up-promemoria",
        title: "Follow-Up e Promemoria",
        description: "Promemoria automatici e follow-up per non dimenticare nulla.",
        sections: [
          {
            id: "promemoria",
            title: "Promemoria Automatici",
            content: `<p>I task con scadenza generano <strong>promemoria automatici</strong> via email quando si avvicinano alla data limite.</p>`
          },
          {
            id: "follow-up",
            title: "Follow-Up",
            content: `<p>Puoi programmare un <strong>follow-up</strong> su un task: una notifica futura che ti ricorda di verificare lo stato di avanzamento.</p>`
          }
        ]
      },
      {
        slug: "esportazione-pdf",
        title: "Esportazione PDF",
        description: "Come esportare la checklist in formato PDF.",
        sections: [
          {
            id: "export",
            title: "Esportazione",
            content: `<p>Puoi esportare l'intera checklist (o una selezione filtrata) in un <strong>PDF</strong> ben formattato, pronto per essere stampato o condiviso.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "tavoli",
    title: "Tavoli",
    icon: LayoutGrid,
    description: "Pianificazione dei tavoli con drag & drop, conflitti e AI.",
    articles: [
      {
        slug: "creare-assegnare-tavoli",
        title: "Creare e Assegnare Tavoli",
        description: "Come creare la mappa dei tavoli e assegnare gli invitati.",
        sections: [
          {
            id: "creare-tavolo",
            title: "Creare un Tavolo",
            content: `<p>Dalla sezione <strong>Tavoli</strong>, clicca su "Aggiungi Tavolo" per creare un nuovo tavolo. Specifica:</p>
<ul>
<li><strong>Nome</strong> (es. "Tavolo 1", "Tavolo degli Sposi")</li>
<li><strong>Capacità</strong> — Numero massimo di posti</li>
<li><strong>Forma</strong> — Rotondo, rettangolare, imperiale</li>
</ul>`
          },
          {
            id: "assegnare-invitati",
            title: "Assegnare gli Invitati",
            content: `<p>Trascina gli invitati dalla <strong>lista "Da Assegnare"</strong> al tavolo desiderato. Il sistema mostra in tempo reale la capienza residua.</p>
<div class="help-callout help-callout-warning">
<strong>⚠️ Attenzione</strong><br/>
Se un tavolo è pieno, non potrai aggiungere altri invitati finché non aumenti la capacità o rimuovi qualcuno.
</div>`
          }
        ]
      },
      {
        slug: "drag-drop-conflitti",
        title: "Drag & Drop e Conflitti",
        description: "Gestione visuale dei tavoli e risoluzione dei conflitti.",
        sections: [
          {
            id: "canvas",
            title: "Canvas Interattivo",
            content: `<p>La vista canvas ti permette di posizionare i tavoli nello spazio e visualizzare la disposizione dalla sala. Puoi trascinare e ruotare i tavoli.</p>`
          },
          {
            id: "conflitti",
            title: "Gestione Conflitti",
            content: `<p>Puoi segnalare <strong>conflitti</strong> tra invitati (persone che non devono sedersi allo stesso tavolo). Il sistema ti avviserà se provi ad assegnarli insieme.</p>`
          }
        ]
      },
      {
        slug: "smart-grouper",
        title: "Smart Grouper (AI)",
        description: "L'AI che suggerisce la disposizione ottimale dei tavoli.",
        sections: [
          {
            id: "come-funziona",
            title: "Come Funziona",
            content: `<p>Lo <strong>Smart Grouper</strong> usa l'intelligenza artificiale per suggerire una disposizione ottimale dei tavoli, tenendo conto di:</p>
<ul>
<li>Gruppi e affinità tra invitati</li>
<li>Conflitti da rispettare</li>
<li>Capienza dei tavoli</li>
<li>Nuclei familiari (non vengono separati)</li>
</ul>
<p>Puoi accettare, modificare o rifiutare il suggerimento dell'AI.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "catering",
    title: "Catering",
    icon: ChefHat,
    description: "Diete, menu composer, stampa menu ed esportazione.",
    articles: [
      {
        slug: "diete-preferenze",
        title: "Diete e Preferenze",
        description: "Come gestire le esigenze alimentari degli invitati.",
        sections: [
          {
            id: "configurazione",
            title: "Configurazione Diete",
            content: `<p>Dalla sezione <strong>Catering</strong>, puoi abilitare le opzioni dietetiche che vuoi tracciare:</p>
<ul>
<li>Vegetariano</li>
<li>Vegano</li>
<li>Celiaco / Senza glutine</li>
<li>Intollerante al lattosio</li>
<li>Altro (campo libero)</li>
</ul>
<p>Queste opzioni appaiono anche nel form RSVP, dove gli invitati possono selezionarle autonomamente.</p>`
          },
          {
            id: "riepilogo",
            title: "Riepilogo per il Catering",
            content: `<p>La sezione mostra un <strong>riepilogo</strong> delle esigenze dietetiche aggregate, pronto per essere condiviso con il fornitore del catering. Include anche i pasti dello staff dei fornitori.</p>`
          }
        ]
      },
      {
        slug: "menu-composer",
        title: "Menu Composer",
        description: "Crea e stampa il menu del ricevimento.",
        sections: [
          {
            id: "creare-menu",
            title: "Creare il Menu",
            content: `<p>Il <strong>Menu Composer</strong> ti permette di progettare il menu del ricevimento con portate, descrizioni e abbinamenti.</p>
<p>Puoi creare menu diversi per adulti, bambini e diete speciali.</p>`
          },
          {
            id: "stampa",
            title: "Stampa e Design",
            content: `<p>Una volta completato, puoi esportare il menu in un design elegante pronto per la stampa, con font e layout personalizzabili.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "inviti-rsvp",
    title: "Inviti e RSVP",
    icon: Send,
    description: "Campagne Save the Date, RSVP, design integrato e Print Studio.",
    articles: [
      {
        slug: "campagne-save-the-date",
        title: "Campagne Save the Date",
        description: "Come inviare i Save the Date digitali via WhatsApp.",
        sections: [
          {
            id: "creare-campagna",
            title: "Creare la Campagna",
            content: `<p>La campagna <strong>Save the Date</strong> serve a preannunciare la data del matrimonio. Si invia via WhatsApp con un link personalizzato.</p>
<p>Puoi personalizzare il messaggio e l'immagine che accompagna il link.</p>`
          },
          {
            id: "invio",
            title: "Invio e Tracciamento",
            content: `<p>L'invio avviene nucleo per nucleo tramite WhatsApp. L'app tiene traccia di chi ha ricevuto il Save the Date e chi ha risposto.</p>`
          }
        ]
      },
      {
        slug: "campagne-rsvp",
        title: "Campagne RSVP",
        description: "Come inviare gli inviti RSVP digitali e raccogliere le conferme.",
        sections: [
          {
            id: "configurazione",
            title: "Configurazione RSVP",
            content: `<p>Configura la campagna RSVP specificando:</p>
<ul>
<li><strong>Data di scadenza</strong> — Oltre la quale non si accettano risposte</li>
<li><strong>Messaggio personalizzato</strong></li>
<li><strong>Domande aggiuntive</strong> — Diete, note, +1</li>
<li><strong>Immagine di copertina</strong></li>
</ul>`
          },
          {
            id: "esperienza-invitato",
            title: "L'Esperienza dell'Invitato",
            content: `<p>L'invitato riceve un link che apre un'<strong>esperienza immersiva a schermo intero</strong> con l'invito personalizzato. Può confermare, declinare e indicare le sue preferenze alimentari per sé e per tutti i membri del suo nucleo.</p>`
          }
        ]
      },
      {
        slug: "design-integrato",
        title: "Design Integrato",
        description: "Come creare partecipazioni digitali con il design integrato.",
        sections: [
          {
            id: "editor",
            title: "L'Editor",
            content: `<p>Il <strong>Design Integrato</strong> ti permette di creare partecipazioni con layout preconfigurati e personalizzabili. Puoi scegliere font, colori e stili per ogni elemento.</p>
<p>Il saluto viene generato automaticamente in base al nome del nucleo e al genere dei destinatari.</p>`
          }
        ]
      },
      {
        slug: "print-studio",
        title: "Print Studio",
        description: "Generazione di inviti stampabili con il tuo design personalizzato.",
        sections: [
          {
            id: "porta-il-tuo-design",
            title: "Porta il Tuo Design",
            content: `<p>Il <strong>Print Studio</strong> ti permette di caricare il tuo design di partecipazione (creato su Canva, Photoshop, ecc.) e generare automaticamente un PDF per ogni nucleo familiare con il saluto personalizzato.</p>
<div class="help-callout help-callout-info">
<strong>💡 Suggerimento</strong><br/>
Carica un'immagine di sfondo e posiziona il testo del saluto dove preferisci usando l'editor drag & drop. L'app genererà un PDF per ogni nucleo con il saluto corretto!
</div>`
          },
          {
            id: "saluti-automatici",
            title: "Saluti Automatici",
            content: `<p>Il sistema genera automaticamente il saluto corretto per ogni nucleo:</p>
<ul>
<li><strong>Caro Marco</strong> — singolo maschile</li>
<li><strong>Cara Giulia</strong> — singolo femminile</li>
<li><strong>Cari Marco e Giulia</strong> — coppia o gruppo misto</li>
<li><strong>Care Alessandra e Mariachiara</strong> — gruppo di sole donne</li>
<li><strong>Cara Famiglia Rossi</strong> — nucleo con "Famiglia"</li>
</ul>`
          }
        ]
      },
      {
        slug: "libretto-messa",
        title: "Libretto Messa",
        description: "Generatore di libretti per la cerimonia religiosa.",
        sections: [
          {
            id: "creazione",
            title: "Creazione del Libretto",
            content: `<p>Il generatore ti guida step by step nella creazione del libretto della messa:</p>
<ol>
<li><strong>Rito</strong> — Scegli il rito (Romano, ecc.)</li>
<li><strong>Letture</strong> — Seleziona le letture dal database liturgico</li>
<li><strong>Personalizzazione</strong> — Aggiungi testi liberi, preghiere dei fedeli</li>
<li><strong>Stile</strong> — Scegli il template grafico</li>
<li><strong>Anteprima e Download</strong> — Esporta in PDF formato A5</li>
</ol>`
          }
        ]
      }
    ]
  },
  {
    slug: "memories",
    title: "Memories Reel",
    icon: Camera,
    description: "Fotocamera usa e getta digitale con filtri vintage e galleria condivisa.",
    articles: [
      {
        slug: "configurazione-camera",
        title: "Configurazione Camera",
        description: "Come attivare e configurare la fotocamera condivisa.",
        sections: [
          {
            id: "attivazione",
            title: "Attivazione",
            content: `<p>Dalla sezione <strong>Memories Reel</strong>, attiva la fotocamera condivisa. Puoi configurare:</p>
<ul>
<li><strong>Filtro pellicola</strong> — Vintage, B&W, Polaroid, ecc.</li>
<li><strong>Scatti per persona</strong> — Limita il numero di foto per invitato</li>
<li><strong>Modalità di reveal</strong> — Le foto si "sviluppano" dopo una data</li>
<li><strong>Moderazione</strong> — Approva le foto prima che appaiano nella galleria</li>
</ul>`
          }
        ]
      },
      {
        slug: "condivisione-qr",
        title: "Condivisione QR",
        description: "Come condividere il link della fotocamera con gli invitati.",
        sections: [
          {
            id: "qr-poster",
            title: "QR Poster",
            content: `<p>Genera un <strong>poster QR</strong> personalizzabile da stampare e posizionare ai tavoli o in punti strategici della location. Gli invitati scansionano il QR con il loro telefono e accedono direttamente alla fotocamera.</p>`
          }
        ]
      },
      {
        slug: "moderazione-gallery",
        title: "Moderazione e Gallery",
        description: "Come moderare le foto e visualizzare la galleria.",
        sections: [
          {
            id: "moderazione",
            title: "Moderazione",
            content: `<p>Se hai abilitato la moderazione, le foto scattate dagli invitati passano in una coda di approvazione. Puoi approvarle o rifiutarle prima che appaiano nella galleria pubblica.</p>`
          },
          {
            id: "galleria",
            title: "Galleria",
            content: `<p>La galleria raccoglie tutte le foto approvate in un'interfaccia elegante con effetti pellicola. Puoi sfogliare, ingrandire e scaricare le foto.</p>`
          }
        ]
      },
      {
        slug: "download-upgrade",
        title: "Download e Upgrade",
        description: "Come scaricare le foto e sbloccare quelle aggiuntive.",
        sections: [
          {
            id: "download",
            title: "Download",
            content: `<p>Puoi scaricare le foto singolarmente o tutte insieme. Le prime <strong>150 foto</strong> sono incluse gratuitamente.</p>`
          },
          {
            id: "upgrade",
            title: "Upgrade",
            content: `<p>Se vuoi sbloccare tutte le foto oltre il limite gratuito, puoi acquistare un pacchetto di upgrade. Le foto vengono convertite in alta qualità.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "alloggi",
    title: "Alloggi",
    icon: Hotel,
    description: "Gestione hotel, camere e assegnazione degli ospiti.",
    articles: [
      {
        slug: "gestione-hotel",
        title: "Gestione Hotel e Assegnazioni",
        description: "Come gestire gli alloggi per gli invitati.",
        sections: [
          {
            id: "hotel-come-fornitori",
            title: "Hotel come Fornitori",
            content: `<p>Gli hotel vengono gestiti come <strong>fornitori con flag "Alloggio"</strong>. Una volta creato un fornitore con questa opzione, apparirà nella sezione Alloggi.</p>`
          },
          {
            id: "camere",
            title: "Gestione Camere",
            content: `<p>Per ogni hotel, puoi creare le <strong>camere</strong> con capienza, tipo, prezzo per notte e numero di notti.</p>`
          },
          {
            id: "assegnazioni",
            title: "Assegnazione Ospiti",
            content: `<p>Assegna gli invitati alle camere con un semplice dialog. Il sistema mostra in tempo reale la capienza disponibile e i KPI totali.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "timeline",
    title: "Timeline",
    icon: Clock,
    description: "Il programma del giorno del matrimonio.",
    articles: [
      {
        slug: "programma-del-giorno",
        title: "Programma del Giorno",
        description: "Come creare e condividere la timeline del matrimonio.",
        sections: [
          {
            id: "creare-eventi",
            title: "Creare Eventi",
            content: `<p>Dalla sezione <strong>Timeline</strong>, aggiungi gli eventi della giornata (cerimonia, aperitivo, primo ballo, taglio torta, ecc.) con orario, luogo e descrizione.</p>
<p>Puoi riordinare gli eventi trascinandoli.</p>`
          },
          {
            id: "condivisione",
            title: "Condivisione",
            content: `<p>Genera un <strong>link pubblico</strong> per condividere la timeline con gli invitati. Loro potranno consultare il programma della giornata senza bisogno di account.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "calendario",
    title: "Calendario",
    icon: CalendarDays,
    description: "Vista calendario unificata di tutti gli impegni.",
    articles: [
      {
        slug: "vista-unificata",
        title: "Vista Unificata",
        description: "Il calendario che aggrega tutto: appuntamenti, scadenze e pagamenti.",
        sections: [
          {
            id: "contenuto",
            title: "Cosa Contiene",
            content: `<p>Il <strong>Calendario</strong> aggrega in un'unica vista:</p>
<ul>
<li>📅 <strong>Appuntamenti</strong> con i fornitori</li>
<li>✅ <strong>Task</strong> della checklist con scadenza</li>
<li>💳 <strong>Pagamenti</strong> in scadenza</li>
</ul>
<p>Puoi filtrare per tipo di evento e passare tra vista mensile e settimanale.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "chat-collaborazione",
    title: "Chat e Collaborazione",
    icon: MessageCircle,
    description: "Chat interna, ruoli, permessi e modalità Wedding Planner.",
    articles: [
      {
        slug: "chat-interna",
        title: "Chat Interna",
        description: "Come comunicare con il team usando la chat integrata.",
        sections: [
          {
            id: "messaggi",
            title: "Messaggi",
            content: `<p>La <strong>chat interna</strong> permette a tutti i collaboratori del matrimonio di comunicare in un unico posto, senza bisogno di WhatsApp esterni.</p>
<p>I messaggi possono avere <strong>visibilità</strong> pubblica (tutti) o ristretta (solo planner).</p>`
          },
          {
            id: "notifiche",
            title: "Notifiche Email",
            content: `<p>Quando un messaggio viene inviato in chat, i destinatari ricevono una <strong>notifica email</strong> (se non hanno l'app aperta). Possono rispondere direttamente dalla notifica.</p>`
          }
        ]
      },
      {
        slug: "ruoli-permessi",
        title: "Ruoli e Permessi",
        description: "Come gestire chi può fare cosa nell'app.",
        sections: [
          {
            id: "ruoli",
            title: "Ruoli Disponibili",
            content: `<p>L'app supporta tre ruoli principali:</p>
<ul>
<li><strong>Coppia (Owner)</strong> — Accesso completo a tutto</li>
<li><strong>Co-planner</strong> — Accesso quasi completo, con permessi configurabili</li>
<li><strong>Wedding Planner</strong> — Accesso professionale con vista multi-matrimonio</li>
</ul>`
          },
          {
            id: "permessi-granulari",
            title: "Permessi Granulari",
            content: `<p>Per ogni collaboratore, puoi configurare i permessi per area:</p>
<ul>
<li><strong>Visualizza</strong> — Può solo vedere</li>
<li><strong>Modifica</strong> — Può modificare</li>
<li><strong>Crea</strong> — Può aggiungere nuovi elementi</li>
</ul>
<p>Le aree configurabili sono: Invitati, Budget, Checklist, Fornitori, Tavoli, Catering, Timeline.</p>`
          }
        ]
      },
      {
        slug: "wedding-planner-mode",
        title: "Wedding Planner Mode",
        description: "La modalità professionale per i wedding planner.",
        sections: [
          {
            id: "switch-modalita",
            title: "Switch di Modalità",
            content: `<p>I wedding planner possono passare dalla <strong>modalità Sposo</strong> alla <strong>modalità Planner</strong> con un toggle nell'header.</p>
<p>In modalità Planner, l'app mostra un cockpit con tutti i matrimoni gestiti, con KPI aggregati e un feed incrociato.</p>`
          },
          {
            id: "cockpit",
            title: "Cockpit Planner",
            content: `<p>Il cockpit mostra:</p>
<ul>
<li>Card per ogni matrimonio con stato e prossimi task</li>
<li>Calendario aggregato</li>
<li>Inbox centralizzata con messaggi da tutti i matrimoni</li>
</ul>`
          }
        ]
      }
    ]
  },
  {
    slug: "impostazioni",
    title: "Impostazioni",
    icon: Settings,
    description: "Configurazione account, dati matrimonio, team e abbonamento.",
    articles: [
      {
        slug: "dati-matrimonio",
        title: "Dati Matrimonio",
        description: "Come modificare i dati del matrimonio.",
        sections: [
          {
            id: "modifica-dati",
            title: "Modificare i Dati",
            content: `<p>Dalla tab <strong>"Matrimonio"</strong> nelle Impostazioni puoi modificare:</p>
<ul>
<li>Nomi dei partner</li>
<li>Data del matrimonio</li>
<li>Location della cerimonia e del ricevimento</li>
<li>Slug personalizzato per i link (es. marco-e-giulia)</li>
</ul>`
          }
        ]
      },
      {
        slug: "team-inviti",
        title: "Team e Inviti",
        description: "Come invitare collaboratori e gestire il team.",
        sections: [
          {
            id: "invitare",
            title: "Invitare Collaboratori",
            content: `<p>Dalla tab <strong>"Team"</strong>, puoi invitare collaboratori inserendo la loro email. Riceveranno un invito e, una volta registrati, avranno accesso al matrimonio con i permessi che hai configurato.</p>
<p>Puoi anche generare un <strong>codice di accesso</strong> condivisibile.</p>`
          }
        ]
      },
      {
        slug: "abbonamento",
        title: "Abbonamento",
        description: "Gestione piano, trial e fatturazione.",
        sections: [
          {
            id: "trial",
            title: "Periodo di Prova",
            content: `<p>Ogni nuovo matrimonio inizia con un <strong>trial gratuito di 30 giorni</strong>. Durante il trial hai accesso a tutte le funzionalità.</p>
<p>Negli ultimi 3 giorni del trial, un avviso ti inviterà ad attivare un abbonamento.</p>`
          },
          {
            id: "upgrade",
            title: "Upgrade",
            content: `<p>Dalla pagina di upgrade puoi scegliere il piano che fa per te e procedere al pagamento sicuro con Stripe.</p>`
          }
        ]
      }
    ]
  },
  {
    slug: "sito-web",
    title: "Sito Web del Matrimonio",
    icon: Globe,
    description: "Generatore di siti web per il matrimonio.",
    articles: [
      {
        slug: "generatore-sito",
        title: "Generatore Sito",
        description: "Come creare il sito web del tuo matrimonio.",
        sections: [
          {
            id: "wizard",
            title: "Wizard di Configurazione",
            content: `<p>Il generatore di siti ti guida nella creazione di un sito web per il tuo matrimonio attraverso un wizard che definisce:</p>
<ul>
<li><strong>Stile e tono</strong> — Elegante, romantico, moderno, minimalista</li>
<li><strong>Sezioni</strong> — La nostra storia, programma, location, RSVP, gallery</li>
<li><strong>Colori e font</strong> — Personalizzazione visuale</li>
</ul>
<p>Il sito viene generato automaticamente e ospitato su un URL personalizzato.</p>`
          }
        ]
      }
    ]
  }
];

export function getCategoryBySlug(slug: string): HelpCategory | undefined {
  return helpCategories.find(c => c.slug === slug);
}

export function getArticle(categorySlug: string, articleSlug: string): { category: HelpCategory; article: HelpArticle } | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  const article = category.articles.find(a => a.slug === articleSlug);
  if (!article) return undefined;
  return { category, article };
}
