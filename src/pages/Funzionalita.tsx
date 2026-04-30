import ContentPageShell from "@/components/landing/ContentPageShell";
import { T } from "@/components/landing/LandingTokens";

const features = [
  {
    ico: "💰",
    title: "Tesoreria smart",
    desc: "Budget e spese in tempo reale. Vedi a colpo d'occhio quanto hai allocato e quanto resta. Allarmi quando una categoria sta per sforare.",
    tags: ["Budget", "Spese", "Allarmi", "Categorie"],
  },
  {
    ico: "👥",
    title: "Lista invitati",
    desc: "Aggiungi invitati, gestisci RSVP, assegna tavoli con drag & drop. Gli ospiti rispondono tramite link, le conferme entrano in automatico.",
    tags: ["RSVP", "Tavoli", "Gruppi", "Diete"],
  },
  {
    ico: "🤝",
    title: "Gestione fornitori",
    desc: "Catalogo fornitori con stato (in valutazione, opzionato, confermato), contatti, contratti e piano pagamenti collegato alla tesoreria.",
    tags: ["Stati", "Pagamenti", "Contratti", "Note"],
  },
  {
    ico: "✓",
    title: "Checklist intelligente",
    desc: "Cose da fare a 12, 6, 3 mesi e 1 mese dal matrimonio. Si adatta alle tue scelte e ti ricorda quello che conta davvero.",
    tags: ["Timeline", "Reminder", "Priorità"],
  },
  {
    ico: "⛪",
    title: "Libretto messa",
    desc: "Genera il libretto della cerimonia partendo da letture preimpostate, personalizzando testi e stile. Esporti in PDF pronto per la stampa.",
    tags: ["Liturgia", "PDF", "Stampa A5"],
  },
  {
    ico: "🪑",
    title: "Disposizione tavoli",
    desc: "Componi la sala graficamente. Tavoli tondi, imperiali, posti liberi. Drag & drop degli invitati, conflitti rilevati automaticamente.",
    tags: ["Drag & drop", "Conflitti", "Stampa"],
  },
];

const Funzionalita = () => (
  <ContentPageShell
    active="funzionalita"
    eyebrow="Funzionalità"
    heroTitle={
      <>
        Tutto quello che serve.{" "}
        <em style={{ fontStyle: "italic", color: T.brandInk }}>Niente di superfluo.</em>
      </>
    }
    heroLede="Sei moduli che si parlano fra loro. Quando aggiungi un fornitore, le sue spese vanno nel budget. Quando un invitato conferma, il piano tavoli si aggiorna."
    metaTitle="Funzionalità — WedsApp"
    metaDescription="Tesoreria, invitati, fornitori, checklist, libretto messa e disposizione tavoli. Sei moduli integrati per organizzare il matrimonio senza stress."
  >
    <section style={{ padding: "40px 0 96px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: T.surface,
                borderRadius: 16,
                border: `1px solid ${T.border}`,
                padding: "32px 28px",
                boxShadow: T.shadowSm,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #F3EEFF 0%, #E9DEFF 100%)",
                  border: "1px solid rgba(139,92,246,.2)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 26,
                }}
              >
                {f.ico}
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: T.fontSerif,
                    fontWeight: 500,
                    fontSize: 24,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    margin: "0 0 10px",
                    color: T.ink,
                  }}
                >
                  {f.title}
                </h2>
                <p style={{ fontSize: 15, color: T.ink2, margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: "auto",
                  paddingTop: 8,
                }}
              >
                {f.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: T.ink2,
                      background: T.surfaceMuted,
                      border: `1px solid ${T.border}`,
                      padding: "4px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </ContentPageShell>
);

export default Funzionalita;
