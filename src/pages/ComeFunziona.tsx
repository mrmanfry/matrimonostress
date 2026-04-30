import ContentPageShell from "@/components/landing/ContentPageShell";
import { T } from "@/components/landing/LandingTokens";

const phases = [
  {
    ph: "Settimana 1",
    title: "Crea lo spazio",
    items: [
      "Registrati con email o Google",
      "Inserisci data e luogo",
      "Invita il/la partner come co-organizzatore",
    ],
  },
  {
    ph: "Mese 1",
    title: "Imposta il budget",
    items: [
      "Distribuisci il budget per categoria",
      "Aggiungi i primi fornitori",
      "Configura le scadenze importanti",
    ],
  },
  {
    ph: "Mese 2-6",
    title: "Popola gli invitati",
    items: [
      "Importa lista da rubrica o file",
      "Invia link RSVP personalizzato",
      "Monitora le conferme in tempo reale",
    ],
  },
  {
    ph: "Mese 6-9",
    title: "Pianifica i dettagli",
    items: [
      "Componi il libretto della cerimonia",
      "Disponi i tavoli con drag & drop",
      "Concorda il menu finale",
    ],
  },
  {
    ph: "Ultime settimane",
    title: "Il giorno del sì",
    items: [
      "Riepilogo timeline a portata di mano",
      "Contatti fornitori sempre accessibili",
      "Tutto sotto controllo, niente sorprese",
    ],
  },
];

const ComeFunziona = () => (
  <ContentPageShell
    active="come-funziona"
    eyebrow="Come funziona"
    heroTitle={
      <>
        Dal primo «sì» al{" "}
        <em style={{ fontStyle: "italic", color: T.brandInk }}>grande giorno.</em>
      </>
    }
    heroLede="Una timeline che ti accompagna mese per mese. Niente da capire, basta seguire i suggerimenti."
    metaTitle="Come funziona — WedsApp"
    metaDescription="La roadmap completa per organizzare il tuo matrimonio: dalla creazione dello spazio al giorno del sì, passo dopo passo con WedsApp."
  >
    <section style={{ padding: "40px 0 96px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 48px" }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: 26,
              top: 8,
              bottom: 8,
              width: 2,
              background: T.border,
              borderRadius: 1,
            }}
          />
          {phases.map((p, i) => (
            <div
              key={p.title}
              style={{
                display: "flex",
                gap: 24,
                paddingBottom: 40,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: T.surface,
                  border: `2px solid ${T.brand}`,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  fontFamily: T.fontSerif,
                  fontStyle: "italic",
                  fontSize: 18,
                  fontWeight: 500,
                  color: T.brandInk,
                  position: "relative",
                  zIndex: 1,
                  boxShadow: `0 0 0 6px ${T.bg}`,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  flex: 1,
                  background: T.surface,
                  borderRadius: 14,
                  border: `1px solid ${T.border}`,
                  padding: "20px 24px",
                  boxShadow: T.shadowSm,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.brandInk,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    marginBottom: 6,
                  }}
                >
                  {p.ph}
                </div>
                <h2
                  style={{
                    fontFamily: T.fontSerif,
                    fontWeight: 500,
                    fontSize: 24,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    margin: "0 0 14px",
                    color: T.ink,
                  }}
                >
                  {p.title}
                </h2>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {p.items.map((it) => (
                    <li
                      key={it}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                        fontSize: 14.5,
                        color: T.ink2,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: T.brand,
                          flexShrink: 0,
                          transform: "translateY(-2px)",
                        }}
                      />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </ContentPageShell>
);

export default ComeFunziona;
