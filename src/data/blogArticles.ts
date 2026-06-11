// Articoli del blog/risorse WedsApp.
// Ogni articolo è ottimizzato SEO con title/description, slug parlante,
// interlinking secondo la mappa hub-and-spoke del brief.

export interface BlogArticle {
  slug: string;
  category: string;
  title: string;
  description: string;
  readMinutes: number;
  publishedAt: string; // ISO
  updatedAt: string; // ISO
  /** HTML body (gerarchia h2/h3, link interni, no h1 — il titolo è già h1 nella pagina). */
  bodyHtml: string;
  /** Slug degli articoli correlati da mostrare in fondo. */
  related: string[];
  isHub?: boolean;
}

const PRODUCT_URL = "/funzionalita";
const link = (slug: string, label: string) =>
  `<a href="/risorse/${slug}">${label}</a>`;
const product = (label = "WedsApp") => `<a href="${PRODUCT_URL}">${label}</a>`;

export const blogArticles: BlogArticle[] = [
  {
    slug: "guida-completa-organizzare-matrimonio",
    category: "Guida principale",
    title: "Come organizzare un matrimonio: la guida completa dall'inizio alla fine",
    description:
      "Tutto quello che serve sapere per organizzare il matrimonio passo dopo passo: budget, invitati, fornitori, tavoli, scadenze. La guida definitiva, aggiornata al 2026.",
    readMinutes: 15,
    publishedAt: "2026-06-11",
    updatedAt: "2026-06-11",
    isHub: true,
    related: [
      "checklist-matrimonio-mese-per-mese",
      "budget-matrimonio-italia-2026",
      "migliori-app-matrimonio-2026",
      "gestire-lista-invitati-rsvp",
      "gestire-fornitori-matrimonio",
    ],
    bodyHtml: `
<p class="lede">Tutto quello che serve sapere per organizzare il matrimonio passo dopo passo: budget, invitati, fornitori, tavoli, scadenze. La guida definitiva, aggiornata al 2026.</p>

<h2>1. Le tre decisioni di partenza</h2>
<p>Prima di pensare a fiori, menu o bomboniere, ci sono <strong>tre decisioni che condizionano tutto il resto</strong> e vanno prese insieme, perché si influenzano a vicenda:</p>
<ul>
  <li><strong>Il budget complessivo.</strong> Quanto siete disposti e in grado di spendere, comprendendo eventuali contributi delle famiglie.</li>
  <li><strong>Il numero indicativo di invitati.</strong> È il moltiplicatore più potente: ogni ospite incide su catering, location, inviti, bomboniere e tavoli.</li>
  <li><strong>Il periodo e la data.</strong> Influisce su disponibilità delle location, prezzi (alta o bassa stagione) e tipo di evento.</li>
</ul>
<p>Definite queste tre, ogni scelta successiva avrà dei vincoli chiari. Cambiarne una a metà percorso costringe a rifare i conti su tutto il resto.</p>

<h2>2. Il budget: come impostarlo e non sforare</h2>
<p>L'errore più comune è procedere al contrario: sommare i preventivi man mano che arrivano e scoprire troppo tardi di aver sforato. L'approccio corretto è l'opposto.</p>
<p><strong>Parti dal totale, poi distribuisci.</strong> Stabilito il budget complessivo, assegna una percentuale indicativa a ogni voce: ricevimento (catering + location), foto e video, abiti, fiori, musica, inviti e bomboniere, trasporti, fondo imprevisti.</p>
<p><strong>Aggiorna il consuntivo a ogni acconto.</strong> Il budget non è un foglio da compilare una volta: è uno strumento vivo. Approfondisci nel ${link("budget-matrimonio-italia-2026", "report sul budget matrimonio in Italia 2026")}.</p>

<h2>3. Data e location</h2>
<p>Le location più richieste vanno prenotate con largo anticipo, spesso oltre un anno prima. Valuta capienza, coerenza con lo stile, cosa è incluso (catering interno o esterno, allestimenti, parcheggio, piano B in caso di pioggia) e vincoli su orari, musica e fornitori esterni.</p>

<h2>4. La lista degli invitati e gli RSVP</h2>
<p>Costruisci una lista unica e condivisa tra i due partner, suddivisa per gruppi. Gli RSVP digitali eliminano il caos di telefonate e messaggi: gli invitati confermano con un link, indicando anche menu e accompagnatori. Approfondisci in ${link("gestire-lista-invitati-rsvp", "come gestire la lista invitati e gli RSVP digitali")}.</p>

<h2>5. I fornitori: chi serve e come sceglierli</h2>
<p>I fornitori tipici: location e catering, fotografo e videomaker, fiorista, musica, abiti, make-up e acconciatura, inviti, bomboniere, trasporti, officiante. Chiedi sempre più preventivi a parità di servizio, verifica recensioni reali e portfolio recenti, controlla la disponibilità per la tua data prima di affezionarti. Vedi ${link("gestire-fornitori-matrimonio", "come gestire i fornitori del matrimonio")}.</p>

<h2>6. I contratti: cosa controllare</h2>
<p>Ogni fornitore importante va formalizzato con un contratto. Verifica cosa è incluso, importi e scadenze di acconto e saldo, penali in caso di disdetta, clausole su imprevisti, tempi di consegna. Alcune app oggi analizzano i contratti con l'AI: carichi il PDF e ottieni un riepilogo delle clausole chiave — una funzione disponibile in ${product()}.</p>

<h2>7. La cerimonia</h2>
<p>Civile, religiosa o simbolica: ognuna ha tempi e requisiti diversi. Verifica con anticipo le pratiche necessarie, perché alcuni documenti hanno scadenze e tempi di rilascio.</p>

<h2>8. Il ricevimento e la disposizione dei tavoli</h2>
<p>Concorda il menu con il catering tenendo conto di intolleranze e preferenze raccolte con gli RSVP. Per il seating si parte dalla lista confermata e si raggruppano gli ospiti per affinità. Il tableau de mariage all'ingresso indica a ogni ospite il proprio tavolo.</p>

<h2>9. Inviti e comunicazione con gli ospiti</h2>
<p>La tendenza è verso una pagina web del matrimonio che funziona da punto di riferimento per gli ospiti: data e orario, mappa, dress code, programma, modulo RSVP, informazioni pratiche. Una pagina a blocchi permette di aggiungere solo le sezioni che servono.</p>

<h2>10. La settimana del matrimonio</h2>
<p>Negli ultimi giorni l'obiettivo è chiudere i dettagli e delegare: conferma finale al catering, saldo dei fornitori, programma con orari e contatti, kit con fedi e documenti, un referente per gli imprevisti del giorno stesso.</p>

<h2>11. Strumenti per organizzare tutto</h2>
<p>Le app dedicate centralizzano tutto in un unico posto: invitati e RSVP, budget in tempo reale, fornitori e scadenze, disposizione dei tavoli e pagina per gli ospiti. Confronta le opzioni in ${link("migliori-app-matrimonio-2026", "le migliori app per il matrimonio 2026")} e segui la ${link("checklist-matrimonio-mese-per-mese", "checklist mese per mese")} per non dimenticare nulla.</p>
`,
  },

  {
    slug: "checklist-matrimonio-mese-per-mese",
    category: "Pianificazione",
    title: "Checklist matrimonio: cosa fare mese per mese",
    description:
      "Dalla proposta al giorno del sì: la timeline completa dei preparativi, mese per mese. Una guida pratica per non dimenticare nulla.",
    readMinutes: 8,
    publishedAt: "2026-06-11",
    updatedAt: "2026-06-11",
    related: [
      "guida-completa-organizzare-matrimonio",
      "budget-matrimonio-italia-2026",
      "gestire-lista-invitati-rsvp",
    ],
    bodyHtml: `
<p class="lede">Dalla proposta al giorno del sì: la timeline completa dei preparativi, mese per mese.</p>
<blockquote>I tempi sono indicativi e partono da circa 12 mesi prima. Se hai meno tempo, comprimi le prime fasi ma mantieni l'ordine: budget e location vengono sempre prima di tutto il resto.</blockquote>

<h2>12 mesi prima — Le fondamenta</h2>
<ul>
  <li>Definire il <strong>budget complessivo</strong>, inclusi eventuali contributi delle famiglie.</li>
  <li>Stabilire il <strong>numero indicativo di invitati</strong>.</li>
  <li>Scegliere il <strong>periodo e la data</strong>.</li>
  <li>Decidere il tipo di cerimonia (civile, religiosa, simbolica).</li>
  <li>Iniziare a visitare le <strong>location</strong> e bloccarne una con un acconto.</li>
</ul>

<h2>10–11 mesi prima — I fornitori chiave</h2>
<ul>
  <li>Prenotare <strong>fotografo e videomaker</strong>.</li>
  <li>Scegliere e bloccare il <strong>catering</strong>, se non incluso nella location.</li>
  <li>Avviare le <strong>pratiche per la cerimonia</strong>.</li>
  <li>Iniziare la ricerca dell'<strong>abito da sposa</strong> (tempi di confezione lunghi).</li>
  <li>Aprire un sistema per tracciare budget e fornitori in un unico posto.</li>
</ul>

<h2>8–9 mesi prima — Musica, fiori e stile</h2>
<ul>
  <li>Scegliere <strong>musica e intrattenimento</strong>.</li>
  <li>Selezionare il <strong>fiorista</strong> e definire lo stile degli allestimenti.</li>
  <li>Definire la <strong>palette e il tema</strong>.</li>
  <li>Scegliere <strong>l'abito dello sposo</strong> e gli accessori.</li>
  <li>Compilare la <strong>lista invitati definitiva</strong>, suddivisa per gruppi.</li>
</ul>

<h2>6–7 mesi prima — Comunicazione e dettagli</h2>
<ul>
  <li>Realizzare gli <strong>inviti</strong> (cartacei, digitali o entrambi).</li>
  <li>Creare la <strong>pagina web del matrimonio</strong>.</li>
  <li>Prenotare trasporti ed eventuali navette per gli invitati.</li>
  <li>Organizzare alloggi consigliati per gli ospiti da fuori.</li>
  <li>Prenotare make-up e acconciatura e fissare una prova.</li>
</ul>

<h2>4–5 mesi prima — Si entra nel vivo</h2>
<ul>
  <li><strong>Spedire gli inviti</strong> e attivare le conferme RSVP.</li>
  <li>Definire il <strong>menu</strong> con il catering.</li>
  <li>Scegliere le <strong>bomboniere</strong>.</li>
  <li>Acquistare le <strong>fedi</strong>.</li>
  <li>Prima <strong>prova abito</strong>.</li>
</ul>

<h2>2–3 mesi prima — Conferme e organizzazione</h2>
<ul>
  <li>Raccogliere e monitorare gli <strong>RSVP</strong>. Vedi ${link("gestire-lista-invitati-rsvp", "come gestire la lista invitati")}.</li>
  <li>Iniziare la <strong>disposizione dei tavoli</strong> sulla base delle conferme.</li>
  <li>Raccogliere <strong>intolleranze e preferenze alimentari</strong>.</li>
  <li>Confermare i dettagli con tutti i fornitori e rivedere i contratti.</li>
  <li>Pianificare il <strong>programma della giornata</strong>.</li>
</ul>

<h2>1 mese prima — Gli ultimi tasselli</h2>
<ul>
  <li>Comunicare i numeri definitivi al catering.</li>
  <li>Completare il tableau de mariage e i segnaposto.</li>
  <li>Prova generale dell'abito.</li>
  <li>Preparare i pagamenti finali secondo le scadenze dei contratti.</li>
  <li>Confermare orari con foto/video, musica, trasporti.</li>
</ul>

<h2>La settimana del matrimonio</h2>
<ul>
  <li>Saldare i fornitori secondo le scadenze.</li>
  <li>Consegnare a fornitori e testimoni un programma con orari e contatti.</li>
  <li>Preparare un kit essenziale (fedi, documenti, dettagli).</li>
  <li>Designare un referente per gli imprevisti del giorno.</li>
</ul>

<h2>Suggerimento pratico</h2>
<p>Tenere questa checklist su Excel funziona, ma con molti invitati conviene un'app dedicata che integri timeline, budget, RSVP e fornitori in un unico posto, con promemoria automatici. Scopri ${product("come funziona WedsApp")} oppure leggi la ${link("guida-completa-organizzare-matrimonio", "guida completa all'organizzazione")}.</p>
`,
  },

  {
    slug: "budget-matrimonio-italia-2026",
    category: "Budget",
    title: "Budget matrimonio in Italia: quanto costa sposarsi davvero nel 2026",
    description:
      "Cifre reali, fasce di prezzo per voce e differenze regionali. Una guida concreta per impostare il budget del matrimonio senza sorprese.",
    readMinutes: 10,
    publishedAt: "2026-06-11",
    updatedAt: "2026-06-11",
    related: [
      "guida-completa-organizzare-matrimonio",
      "migliori-app-matrimonio-2026",
      "gestire-fornitori-matrimonio",
    ],
    bodyHtml: `
<p class="lede">Cifre reali, fasce di prezzo per voce e differenze regionali. Una guida concreta per impostare il budget del matrimonio senza sorprese.</p>

<h2>In breve</h2>
<p>Nel 2026 il costo di un matrimonio in Italia varia molto in base al numero di invitati, alla regione e allo stile. Le stime di settore si collocano in genere tra i <strong>18.000</strong> e i <strong>35.000 euro</strong>, con un valore medio spesso indicato intorno ai <strong>25.000–27.000 euro</strong>. La voce più pesante è quasi sempre il ricevimento.</p>

<h2>Quanto costa un matrimonio in Italia nel 2026: i dati</h2>
<ul>
  <li>Secondo il <strong>Rapporto del Settore Nuziale 2026</strong>, il costo medio si aggira intorno ai <strong>27.300 euro</strong>, in crescita del 9% sull'anno precedente, con un costo medio per invitato di circa <strong>238 euro</strong>.</li>
  <li>Alcune analisi riportano che tre coppie su dieci spendono 30.000 euro o più.</li>
  <li>Un'indagine commissionata da Facile.it indica una cifra più bassa, intorno ai 13.700 euro, ma misura un perimetro più ristretto.</li>
</ul>
<blockquote>Il dato che conta di più: il numero di invitati. È il moltiplicatore che fa muovere il budget più di ogni altra decisione.</blockquote>

<h2>Le differenze regionali</h2>
<p>Nel Centro-Sud è più comune avere liste ampie, intorno ai 150 invitati. Nel Nord sono più frequenti matrimoni intorno o sotto i 100 invitati. Ridurre la lista è la leva di risparmio più efficace, molto più del tagliare sulle singole voci.</p>

<h2>Quanto incide ogni voce di spesa</h2>
<div class="table-wrap"><table>
<thead><tr><th>Voce</th><th>Fascia indicativa</th><th>Note</th></tr></thead>
<tbody>
<tr><td>Ricevimento / catering</td><td>90–250 € a invitato</td><td>90–150 € se gestito dalla location; fino a 250 € per menu gourmet</td></tr>
<tr><td>Location</td><td>Molto variabile</td><td>Può essere inclusa nel catering o separata</td></tr>
<tr><td>Foto e video</td><td>Variabile</td><td>Voce su cui si raccomanda di non risparmiare troppo</td></tr>
<tr><td>Fiori e allestimenti</td><td>Da poche centinaia a 9.000 €+</td><td>Cifre più alte in ville e location prestigiose</td></tr>
<tr><td>Abito sposa</td><td>Variabile</td><td>Tempi di confezione lunghi</td></tr>
<tr><td>Abito sposo</td><td>~1.000–3.000 €</td><td>Fascia bassa tradizionali, alta cerimonia</td></tr>
<tr><td>Musica / intrattenimento</td><td>Variabile</td><td>DJ, band o musicisti per la cerimonia</td></tr>
<tr><td>Bomboniere</td><td>Per nucleo o per invitato</td><td>Prevedere un 5–10% di scorta</td></tr>
</tbody></table></div>

<p><em>Fonti: Rapporto del Settore Nuziale 2026, Matrimonio.com, indagini di settore 2026.</em></p>

<h2>Come impostare il budget (senza sforare)</h2>
<ol>
  <li><strong>Definisci il tetto massimo</strong>, includendo eventuali contributi delle famiglie.</li>
  <li><strong>Assegna una percentuale a ogni voce</strong>, partendo dal ricevimento.</li>
  <li><strong>Tieni un fondo imprevisti</strong> del 5–10%.</li>
  <li><strong>Aggiorna il consuntivo a ogni acconto.</strong></li>
</ol>
<p>Quest'ultimo punto è quello che fa la differenza tra restare nel budget e sforare. Per questo molte coppie si affidano ad app di budgeting come ${product()} invece che al foglio Excel. Confronta le opzioni in ${link("migliori-app-matrimonio-2026", "le migliori app per il matrimonio 2026")}.</p>

<h2>Domande frequenti</h2>
<h3>Quanto costa un matrimonio con 100 invitati in Italia?</h3>
<p>Con un costo medio per invitato intorno ai 238 € secondo i dati 2026, un matrimonio da 100 ospiti si colloca spesso nella fascia dei 20.000–30.000 euro.</p>
<h3>Qual è la voce più cara?</h3>
<p>Quasi sempre il ricevimento (catering più location).</p>
<h3>Come si risparmia davvero?</h3>
<p>La leva più efficace è il numero di invitati. Per la gestione dei fornitori e contratti vedi ${link("gestire-fornitori-matrimonio", "come gestire i fornitori del matrimonio")}.</p>
`,
  },

  {
    slug: "migliori-app-matrimonio-2026",
    category: "App e strumenti",
    title: "Le migliori app per organizzare il matrimonio nel 2026",
    description:
      "Guida comparativa e aggiornata: cosa fa ogni app, pro e contro, e come scegliere quella giusta per il tuo matrimonio.",
    readMinutes: 12,
    publishedAt: "2026-06-11",
    updatedAt: "2026-06-11",
    related: [
      "guida-completa-organizzare-matrimonio",
      "excel-o-app-matrimonio",
      "app-matrimonio-gratuite-vs-pagamento",
      "faq-organizzazione-matrimonio",
    ],
    bodyHtml: `
<p class="lede">Guida comparativa alle app più usate in Italia e all'estero, con un confronto onesto di punti di forza e limiti.</p>

<h2>In breve</h2>
<ul>
  <li><strong>Per chi vuole tutto in un unico posto:</strong> ${product()}</li>
  <li><strong>Per la community e i fornitori in Italia:</strong> Matrimonio.com</li>
  <li><strong>Per lista nozze e sito web (USA):</strong> Zola</li>
  <li><strong>Per la directory fornitori più ampia (USA):</strong> The Knot</li>
  <li><strong>Per l'album foto condiviso degli ospiti:</strong> Joy (WithJoy)</li>
</ul>

<h2>Come scegliere un'app per il matrimonio</h2>
<ol>
  <li><strong>Copertura funzionale</strong> — solo un pezzo o l'intero processo?</li>
  <li><strong>Lingua e mercato</strong> — l'italiano e i fornitori locali fanno la differenza.</li>
  <li><strong>Esperienza per gli ospiti</strong> — meglio se non devono scaricare nulla.</li>
  <li><strong>Modello di prezzo</strong> — vedi ${link("app-matrimonio-gratuite-vs-pagamento", "gratuite vs a pagamento: cosa cambia davvero")}.</li>
  <li><strong>Automazione e AI</strong> — analisi contratti, promemoria, suggerimenti sul budget.</li>
</ol>

<h2>Le app a confronto</h2>

<h3>WedsApp — il centro di comando all-in-one</h3>
<p>${product()} nasce con un'idea precisa: mettere tutto nello stesso posto invece di tenere un foglio Excel, un'app per gli inviti e un gestionale per i fornitori.</p>
<ul>
  <li>Gestione completa di invitati e RSVP digitali (conferme, intolleranze, accompagnatori, bambini).</li>
  <li>Budget e spese con monitoraggio in tempo reale di preventivi, acconti e saldi.</li>
  <li>Gestione fornitori con scadenze, contratti e pagamenti in un'unica vista.</li>
  <li><strong>Analisi dei contratti con AI:</strong> carichi il PDF e ottieni un riepilogo delle clausole chiave.</li>
  <li>Pagina invito personalizzabile a blocchi.</li>
</ul>

<h3>Matrimonio.com — community e fornitori italiani</h3>
<p>Uno dei portali più conosciuti in Italia, gratuito, con grande directory di fornitori e community ampia. Più portale di ispirazione che strumento di gestione operativa avanzata.</p>

<h3>Zola — lista nozze e sito web (USA)</h3>
<p>Riferimento USA per sito del matrimonio, lista nozze integrata e gestione invitati. La logica del registry si adatta poco all'Italia.</p>

<h3>The Knot — la directory fornitori più ampia (USA)</h3>
<p>Directory di fornitori più grande negli Stati Uniti, checklist solida, finanziata dai fornitori che propone.</p>

<h3>Joy (WithJoy) — l'album foto degli ospiti</h3>
<p>Sito del matrimonio gratuito e album foto condiviso con spazio spesso illimitato. Copre meno la gestione operativa.</p>

<h2>Tabella comparativa</h2>
<div class="table-wrap"><table>
<thead><tr><th>App</th><th>Invitati/RSVP</th><th>Budget</th><th>Fornitori</th><th>AI contratti</th><th>IT</th><th>Mercato</th></tr></thead>
<tbody>
<tr><td>WedsApp</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>Italia</td></tr>
<tr><td>Matrimonio.com</td><td>✅</td><td>parziale</td><td>✅ (directory)</td><td>❌</td><td>✅</td><td>Italia</td></tr>
<tr><td>Zola</td><td>✅</td><td>✅</td><td>parziale</td><td>❌</td><td>❌</td><td>USA</td></tr>
<tr><td>The Knot</td><td>✅</td><td>✅</td><td>✅ (directory)</td><td>❌</td><td>❌</td><td>USA</td></tr>
<tr><td>Joy</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>parziale</td><td>USA/intl</td></tr>
</tbody></table></div>
<p><em>Le funzioni e i prezzi cambiano nel tempo: verifica sempre sul sito ufficiale.</em></p>

<h2>Excel o app per il matrimonio?</h2>
<p>Approfondisci in ${link("excel-o-app-matrimonio", "Excel o app per il matrimonio: pro, contro e quando scegliere cosa")}.</p>

<h2>Domande frequenti</h2>
<h3>Qual è la migliore app per il matrimonio in Italia?</h3>
<p>Per gestire l'intero processo in italiano e da un unico posto, ${product()} è pensata proprio per questo. Per la sola ricerca fornitori e la community, Matrimonio.com è un riferimento storico. Vedi anche le ${link("faq-organizzazione-matrimonio", "FAQ sull'organizzazione del matrimonio")}.</p>
<h3>Gli ospiti devono scaricare un'app per confermare?</h3>
<p>Non sempre. Le soluzioni migliori permettono di confermare tramite un link, senza installare nulla.</p>
`,
  },

  {
    slug: "excel-o-app-matrimonio",
    category: "App e strumenti",
    title: "Excel o app per organizzare il matrimonio? Pro, contro e quando scegliere cosa",
    description:
      "Il foglio di calcolo è ancora lo strumento più usato. Funziona, ma fino a un certo punto. Ecco quando conviene passare a un'app dedicata.",
    readMinutes: 7,
    publishedAt: "2026-06-11",
    updatedAt: "2026-06-11",
    related: [
      "guida-completa-organizzare-matrimonio",
      "migliori-app-matrimonio-2026",
      "gestire-lista-invitati-rsvp",
    ],
    bodyHtml: `
<p class="lede">Quasi tutte le coppie iniziano con Excel o Google Sheets. Funziona nelle prime settimane, ma mostra i limiti quando il matrimonio cresce in complessità.</p>

<h2>Perché tante coppie iniziano con Excel</h2>
<ul>
  <li>È <strong>gratuito</strong> e già disponibile.</li>
  <li>È <strong>flessibile</strong>: ci si costruisce le colonne che si vogliono.</li>
  <li>È <strong>familiare</strong>: tutti sanno usarlo.</li>
  <li>Si <strong>condivide</strong> facilmente con Google Sheets.</li>
</ul>

<h2>Dove Excel inizia a scricchiolare</h2>
<p><strong>Gli RSVP diventano caos.</strong> Le conferme arrivano via WhatsApp, telefono, email — trascriverle a mano porta a errori e doppioni.</p>
<p><strong>Il budget va aggiornato di continuo.</strong> A ogni acconto bisogna ricalcolare manualmente.</p>
<p><strong>I contratti si accumulano.</strong> Ogni fornitore ha un PDF e scadenze diverse.</p>
<p><strong>Manca l'esperienza per gli ospiti.</strong> Excel non genera una pagina di conferma.</p>
<p><strong>Niente promemoria.</strong> Un foglio non avvisa quando si avvicina una scadenza.</p>

<h2>Cosa aggiunge un'app dedicata</h2>
<ul>
  <li>RSVP digitali compilati da un link — vedi ${link("gestire-lista-invitati-rsvp", "come gestire la lista invitati e gli RSVP")}.</li>
  <li>Budget vivo che si aggiorna a ogni spesa.</li>
  <li>Gestione fornitori e contratti in un'unica vista, con analisi AI delle clausole.</li>
  <li>Pagina per gli ospiti con programma e modulo RSVP.</li>
  <li>Promemoria automatici sulle scadenze.</li>
</ul>

<h2>Tabella di confronto</h2>
<div class="table-wrap"><table>
<thead><tr><th>Aspetto</th><th>Excel / Sheets</th><th>App dedicata</th></tr></thead>
<tbody>
<tr><td>Costo</td><td>Gratuito</td><td>Gratuito o a pagamento</td></tr>
<tr><td>RSVP digitali</td><td>❌</td><td>✅</td></tr>
<tr><td>Budget aggiornato in automatico</td><td>❌ manuale</td><td>✅</td></tr>
<tr><td>Gestione contratti</td><td>parziale</td><td>✅</td></tr>
<tr><td>Analisi contratti AI</td><td>❌</td><td>✅ (alcune app)</td></tr>
<tr><td>Pagina per gli ospiti</td><td>❌</td><td>✅</td></tr>
<tr><td>Promemoria scadenze</td><td>❌</td><td>✅</td></tr>
</tbody></table></div>

<h2>Quando scegliere cosa</h2>
<p><strong>Resta su Excel se:</strong> hai pochi invitati, pochi fornitori e ti trovi a tuo agio.</p>
<p><strong>Passa a un'app se:</strong> la lista supera il centinaio, gestisci molti contratti, vuoi raccogliere gli RSVP senza impazzire. Confronta le opzioni in ${link("migliori-app-matrimonio-2026", "le migliori app per il matrimonio")} o scopri ${product()}.</p>
`,
  },

  {
    slug: "app-matrimonio-gratuite-vs-pagamento",
    category: "App e strumenti",
    title: "App matrimonio gratuite vs a pagamento: cosa cambia davvero",
    description:
      "Esistono molte app gratuite per organizzare il matrimonio. Ma \"gratis\" non significa sempre senza costi. Ecco cosa valutare.",
    readMinutes: 6,
    publishedAt: "2026-06-11",
    updatedAt: "2026-06-11",
    related: [
      "guida-completa-organizzare-matrimonio",
      "migliori-app-matrimonio-2026",
    ],
    bodyHtml: `
<p class="lede">Molte app per il matrimonio offrono un piano gratuito, altre sono a pagamento. La scelta non dipende solo dal prezzo: conta cosa è incluso, come si finanzia l'app e quali funzioni si attivano solo a pagamento.</p>

<h2>I tre modelli di prezzo</h2>
<p><strong>Gratuito.</strong> L'app è interamente gratis. Spesso si finanzia in altri modi (per esempio segnalando fornitori).</p>
<p><strong>Freemium.</strong> Funzioni base gratuite, avanzate (seating, messaggistica, analisi contratti) a pagamento. Il modello più diffuso.</p>
<p><strong>A pagamento.</strong> Abbonamento mensile o pagamento una tantum. Su 12–18 mesi un piccolo abbonamento può superare il costo di una licenza una tantum.</p>

<h2>"Gratis" non sempre vuol dire senza costi</h2>
<ul>
  <li><strong>Funzioni essenziali a pagamento</strong> (seating, esportazione dati).</li>
  <li><strong>App finanziate dai fornitori</strong> che poi raccomanda.</li>
  <li><strong>Limiti nascosti</strong> su invitati, foto o template.</li>
  <li><strong>Pubblicità o branding</strong> dell'app sulla pagina degli ospiti.</li>
</ul>

<h2>Cosa valutare oltre al prezzo</h2>
<ol>
  <li><strong>Copertura funzionale.</strong></li>
  <li><strong>Esperienza per gli ospiti.</strong></li>
  <li><strong>Esportabilità dei dati.</strong></li>
  <li><strong>Lingua e mercato.</strong></li>
  <li><strong>Funzioni che fanno risparmiare tempo</strong> (promemoria, budget automatico, AI sui contratti).</li>
</ol>

<h2>Come scegliere</h2>
<p>Confronta le opzioni concrete in ${link("migliori-app-matrimonio-2026", "le migliori app per il matrimonio 2026")} e leggi la ${link("guida-completa-organizzare-matrimonio", "guida completa")} per capire dove un'app fa davvero la differenza. Per provare un piano gratuito completo in italiano puoi iniziare con ${product()}.</p>
`,
  },

  {
    slug: "gestire-lista-invitati-rsvp",
    category: "Invitati",
    title: "Come gestire la lista invitati al matrimonio (e gli RSVP digitali)",
    description:
      "La gestione degli invitati è una delle attività più sottovalutate e caotiche dei preparativi. Ecco come tenerla sotto controllo.",
    readMinutes: 7,
    publishedAt: "2026-06-11",
    updatedAt: "2026-06-11",
    related: [
      "guida-completa-organizzare-matrimonio",
    ],
    bodyHtml: `
<p class="lede">Gestire bene la lista invitati significa avere un unico elenco condiviso, tracciare lo stato di ogni conferma e raccogliere in modo ordinato accompagnatori, bambini e intolleranze.</p>

<h2>Il problema: perché la lista diventa un caos</h2>
<ul>
  <li><strong>Versioni multiple del file</strong> tra i due partner.</li>
  <li><strong>Conferme sparse</strong> tra WhatsApp, telefono, email.</li>
  <li><strong>Dettagli persi</strong>: intolleranze, accompagnatori, bambini.</li>
  <li><strong>Numeri incerti</strong> a ridosso dell'evento.</li>
</ul>

<h2>Come costruire la lista invitati</h2>
<ol>
  <li><strong>Una lista unica e condivisa</strong> tra i partner.</li>
  <li><strong>Suddividi per gruppi</strong>: famiglia di lei, di lui, amici, lavoro.</li>
  <li>Per ogni invitato traccia: stato conferma, accompagnatore, bambini, intolleranze, recapito.</li>
  <li><strong>Prevedi un margine</strong>: qualche "sì" e "no" fuori tempo arrivano sempre.</li>
</ol>

<h2>Gli RSVP digitali: come funzionano</h2>
<p>L'invitato riceve un <strong>link</strong> (via messaggio, email o QR code) e conferma con pochi tocchi, indicando presenza, accompagnatore, menu o intolleranze. Le risposte confluiscono in un'unica vista sempre aggiornata.</p>
<p><strong>Il vantaggio chiave:</strong> le soluzioni migliori non richiedono agli ospiti di scaricare un'app. Meno attrito significa più conferme raccolte.</p>

<h2>Gestire le conferme nel tempo</h2>
<ul>
  <li>Invia gli inviti alcuni mesi prima e indica una data limite.</li>
  <li>Monitora le risposte distinguendo chi non ha ancora risposto.</li>
  <li>Sollecita chi manca in modo mirato.</li>
  <li>Raccogli le intolleranze direttamente nel modulo.</li>
  <li>Comunica i numeri definitivi al catering.</li>
</ul>

<h2>Excel o app per la lista invitati?</h2>
<p>Con molti invitati conviene un'app che mantiene un'unica lista allineata, raccoglie gli RSVP automaticamente, aggrega intolleranze e menu, collega la lista alla disposizione dei tavoli. Vedi ${product("come funziona WedsApp")} e la ${link("guida-completa-organizzare-matrimonio", "guida completa all'organizzazione")}.</p>

<h2>Domande frequenti</h2>
<h3>Quanto tempo prima si inviano gli inviti?</h3>
<p>In genere alcuni mesi prima, con una data limite per la conferma.</p>
<h3>Come si raccolgono le intolleranze alimentari?</h3>
<p>Direttamente nel modulo RSVP: ogni ospite le segnala al momento della risposta.</p>
<h3>Gli ospiti devono scaricare un'app?</h3>
<p>No, con le soluzioni migliori basta aprire un link o scansionare un QR code.</p>
`,
  },

  {
    slug: "gestire-fornitori-matrimonio",
    category: "Fornitori",
    title: "Come gestire i fornitori del matrimonio: preventivi, contratti, scadenze",
    description:
      "Location, catering, foto, fiori, musica: un matrimonio coinvolge molti fornitori. Ecco come tenere tutto sotto controllo.",
    readMinutes: 8,
    publishedAt: "2026-06-11",
    updatedAt: "2026-06-11",
    related: [
      "guida-completa-organizzare-matrimonio",
      "budget-matrimonio-italia-2026",
    ],
    bodyHtml: `
<p class="lede">Gestire i fornitori significa confrontare i preventivi a parità di servizio, formalizzare ogni accordo con un contratto chiaro e tenere traccia di acconti e saldi in un unico posto.</p>

<h2>Quali fornitori servono</h2>
<ul>
  <li>Location e catering</li>
  <li>Fotografo e videomaker</li>
  <li>Fiorista e allestimenti</li>
  <li>Musica / intrattenimento</li>
  <li>Abiti, make-up e acconciatura</li>
  <li>Inviti e grafica</li>
  <li>Bomboniere</li>
  <li>Trasporti</li>
  <li>Officiante / celebrante</li>
</ul>

<h2>Confrontare i preventivi</h2>
<ul>
  <li><strong>A parità di servizio.</strong></li>
  <li>Verifica cosa è incluso e cosa è extra.</li>
  <li>Controlla la disponibilità per la tua data.</li>
  <li>Guarda recensioni e portfolio recenti.</li>
</ul>
<blockquote>Il preventivo più basso non è sempre il più conveniente: conta cosa comprende, non solo la cifra finale.</blockquote>

<h2>I contratti: cosa controllare prima di firmare</h2>
<ul>
  <li>Cosa è incluso esattamente.</li>
  <li>Acconto e saldo: importi e scadenze.</li>
  <li>Penali in caso di disdetta o rinvio.</li>
  <li>Clausole su imprevisti.</li>
  <li>Tempi di consegna dei materiali.</li>
</ul>
<p>Alcune app oggi <strong>analizzano i contratti con l'AI</strong>: si carica il PDF e si ottiene un riepilogo leggibile di clausole chiave, penali e scadenze. È una delle funzioni di ${product()}.</p>

<h2>Scadenze e pagamenti</h2>
<ul>
  <li>Raccogli tutti i contratti in un unico posto.</li>
  <li>Segna acconti e saldi con le rispettive date.</li>
  <li>Imposta promemoria per le scadenze importanti.</li>
  <li>Tieni una vista d'insieme di quanto pagato e quanto resta — collegata al budget. Vedi ${link("budget-matrimonio-italia-2026", "budget matrimonio Italia 2026")}.</li>
</ul>

<h2>Excel o app per i fornitori?</h2>
<p>Un foglio funziona per pochi fornitori. Con molti, un'app dedicata centralizza tutto, collega i pagamenti al budget, invia promemoria e — con l'AI sui contratti — segnala clausole e penali che potrebbero sfuggire. Vedi la ${link("guida-completa-organizzare-matrimonio", "guida completa all'organizzazione del matrimonio")}.</p>

<h2>Domande frequenti</h2>
<h3>Quanti preventivi conviene chiedere?</h3>
<p>In genere almeno due o tre, confrontati a parità di servizio incluso.</p>
<h3>Quando si pagano i fornitori?</h3>
<p>Di solito un acconto alla firma del contratto e il saldo nei giorni o nelle settimane precedenti l'evento.</p>
<h3>A cosa serve l'analisi dei contratti con l'AI?</h3>
<p>A ottenere un riepilogo chiaro delle condizioni di un contratto caricando il PDF.</p>
`,
  },

  {
    slug: "faq-organizzazione-matrimonio",
    category: "FAQ",
    title: "Domande frequenti sull'organizzazione del matrimonio",
    description:
      "Le risposte chiare alle domande più comuni di chi sta organizzando il matrimonio — dalla pianificazione al budget, dagli invitati ai fornitori.",
    readMinutes: 10,
    publishedAt: "2026-06-11",
    updatedAt: "2026-06-11",
    related: [
      "guida-completa-organizzare-matrimonio",
      "migliori-app-matrimonio-2026",
      "gestire-lista-invitati-rsvp",
      "gestire-fornitori-matrimonio",
    ],
    bodyHtml: `
<p class="lede">Le risposte chiare alle domande più comuni di chi sta organizzando il matrimonio.</p>

<h2>Pianificazione generale</h2>
<h3>Quanto tempo prima conviene iniziare a organizzare il matrimonio?</h3>
<p>In media le coppie pianificano tra i 12 e i 18 mesi. Con meno di 6 mesi è comunque fattibile, ma location e fornitori più richiesti potrebbero essere già occupati.</p>
<h3>Qual è la prima cosa da fare quando si organizza un matrimonio?</h3>
<p>Definire tre cose nell'ordine: il budget complessivo, il numero indicativo di invitati e la data. Vedi la ${link("guida-completa-organizzare-matrimonio", "guida completa")}.</p>
<h3>Conviene assumere un wedding planner?</h3>
<p>Dipende dal tempo a disposizione e dalla complessità dell'evento. Molte coppie scelgono una via di mezzo: un'app per gestire l'organizzazione in autonomia, con eventuale consulenza puntuale.</p>
<h3>Un'app può sostituire il wedding planner?</h3>
<p>No. Un'app centralizza organizzazione, budget e fornitori, ma non sostituisce la consulenza e la rete di contatti di un planner.</p>

<h2>Budget</h2>
<h3>Quanto costa organizzare un matrimonio in Italia?</h3>
<p>Il costo varia molto in base a numero di invitati, location e regione. Vedi i numeri aggiornati in ${link("budget-matrimonio-italia-2026", "budget matrimonio Italia 2026")}.</p>
<h3>Come si gestisce il budget senza sforare?</h3>
<p>Si parte dal totale, si assegna una percentuale a ogni voce e si aggiorna il consuntivo a ogni acconto.</p>
<h3>Qual è la voce più alta?</h3>
<p>Quasi sempre il ricevimento (catering più location).</p>

<h2>Invitati e RSVP</h2>
<h3>Come si gestisce la lista degli invitati?</h3>
<p>Da una lista unica condivisa tra i partner, suddivisa per gruppi. Vedi ${link("gestire-lista-invitati-rsvp", "come gestire la lista invitati e gli RSVP digitali")}.</p>
<h3>Cosa significa RSVP?</h3>
<p>È la richiesta di conferma di presenza. Gli RSVP digitali permettono agli invitati di confermare con un link.</p>
<h3>Gli invitati devono scaricare un'app per confermare?</h3>
<p>Non necessariamente. Le soluzioni migliori permettono di confermare tramite link o QR code.</p>
<h3>Come si raccolgono le intolleranze alimentari?</h3>
<p>Direttamente nel modulo RSVP.</p>

<h2>Fornitori e contratti</h2>
<h3>Quali fornitori servono?</h3>
<p>I principali sono location, catering, fotografo e videomaker, fiorista, musica, abiti, make-up, bomboniere e inviti. Vedi ${link("gestire-fornitori-matrimonio", "come gestire i fornitori del matrimonio")}.</p>
<h3>Come si tengono sotto controllo i contratti?</h3>
<p>Raccogliendoli in un unico posto con scadenze visibili. Alcune app analizzano i contratti con l'AI evidenziando clausole chiave, penali e date.</p>
<h3>A cosa serve l'analisi dei contratti con l'AI?</h3>
<p>Permette di caricare il PDF e ottenere un riepilogo leggibile delle condizioni — funzione disponibile in ${product()}.</p>
<h3>Quando si pagano i fornitori?</h3>
<p>In genere un acconto alla firma e il saldo nei giorni o nelle settimane precedenti l'evento.</p>

<h2>Tavoli e allestimenti</h2>
<h3>Come si organizza la disposizione dei tavoli?</h3>
<p>Si parte dalla lista confermata e si raggruppano le persone per affinità. Strumenti digitali di seating permettono di spostare gli ospiti con il drag-and-drop.</p>
<h3>Differenza tra tableau de mariage e segnatavolo?</h3>
<p>Il tableau è il cartellone all'ingresso che indica a ogni ospite il proprio tavolo; il segnatavolo identifica il singolo tavolo.</p>

<h2>Inviti e comunicazione</h2>
<h3>Meglio inviti cartacei o digitali?</h3>
<p>Dipende dallo stile. Molte coppie li combinano.</p>
<h3>Cosa deve contenere la pagina web del matrimonio?</h3>
<p>Data e orario, luogo, mappa, dress code, programma e modulo RSVP.</p>

<h2>App e strumenti</h2>
<h3>Qual è la migliore app per organizzare il matrimonio?</h3>
<p>Dipende dall'obiettivo. Confronta in ${link("migliori-app-matrimonio-2026", "le migliori app per il matrimonio 2026")}.</p>
<h3>Esiste un'app gratuita?</h3>
<p>Sì, molte. Vale la pena verificare cosa è incluso nel piano gratuito.</p>
<h3>Excel o app dedicata?</h3>
<p>Excel funziona all'inizio. Per la gestione completa vedi ${link("migliori-app-matrimonio-2026", "le migliori app per il matrimonio")}.</p>
<h3>Quali funzioni deve avere una buona app?</h3>
<p>Gestione invitati e RSVP, budget aggiornato in tempo reale, gestione fornitori e scadenze, idealmente analisi dei contratti con AI e pagina invito personalizzabile.</p>
`,
  },
];

export const getArticleBySlug = (slug: string) =>
  blogArticles.find((a) => a.slug === slug);

export const getRelatedArticles = (slugs: string[]) =>
  slugs
    .map((s) => blogArticles.find((a) => a.slug === s))
    .filter((a): a is BlogArticle => !!a);
