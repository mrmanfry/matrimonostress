import { useState } from "react";
import { Link } from "react-router-dom";
import ContentPageShell from "@/components/landing/ContentPageShell";
import { T } from "@/components/landing/LandingTokens";

const plans = [
  {
    name: "Free",
    price: "0",
    tag: "Per iniziare",
    desc: "Tutto il necessario per i primi mesi.",
    features: [
      "Fino a 30 invitati",
      "Budget e spese",
      "Checklist base",
      "1 fornitore confermato",
    ],
    cta: "Inizia gratis",
    highlighted: false,
  },
  {
    name: "Sposi",
    price: "49",
    tag: "Più scelto",
    desc: "Per organizzare il matrimonio dall'inizio alla fine.",
    features: [
      "Invitati illimitati",
      "Tesoreria + piano pagamenti",
      "Disposizione tavoli",
      "Libretto messa",
      "Fornitori illimitati",
      "Esportazioni PDF/Excel",
      "Supporto prioritario",
    ],
    cta: "Scegli Sposi",
    highlighted: true,
  },
  {
    name: "Atelier",
    price: "149",
    tag: "Per wedding planner",
    desc: "Gestisci più matrimoni, un team, brand personalizzato.",
    features: [
      "Tutto in Sposi",
      "Multi-matrimonio",
      "Co-organizzatori illimitati",
      "White-label",
      "API e integrazioni",
      "Account manager dedicato",
    ],
    cta: "Parla con noi",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "Posso annullare in qualsiasi momento?",
    a: "Sì, sempre. Nessun vincolo, nessuna penale. I tuoi dati restano accessibili in modalità lettura per 90 giorni.",
  },
  {
    q: "Cosa succede dopo il matrimonio?",
    a: "Lo spazio rimane attivo per tutto il piano scelto. Puoi esportare ricordi, lista invitati, contatti fornitori in qualsiasi momento.",
  },
  {
    q: "Il prezzo è una tantum o ricorrente?",
    a: "Tariffa una tantum dalla data di registrazione fino a 30 giorni dopo il matrimonio. Niente abbonamenti dimenticati.",
  },
  {
    q: "Posso passare da Free a Sposi?",
    a: "Certo. Aggiorna in qualsiasi momento e mantieni tutti i dati. Paghi solo la differenza.",
  },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: T.surface,
        borderRadius: 12,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          fontSize: 15,
          fontWeight: 500,
          color: T.ink,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
        aria-expanded={open}
      >
        {q}
        <span
          style={{
            fontSize: 18,
            color: T.brandInk,
            transform: open ? "rotate(45deg)" : "rotate(0)",
            transition: "transform .2s",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0 22px 18px",
            fontSize: 14.5,
            color: T.ink2,
            lineHeight: 1.6,
          }}
        >
          {a}
        </div>
      )}
    </div>
  );
};

const Prezzi = () => (
  <ContentPageShell
    active="prezzi"
    eyebrow="Prezzi"
    heroTitle={
      <>
        Un prezzo,{" "}
        <em style={{ fontStyle: "italic", color: T.brandInk }}>una volta sola.</em>
      </>
    }
    heroLede="Scegli il piano una volta, paghi una volta. Nessun abbonamento, nessuna sorpresa."
    metaTitle="Prezzi — WedsApp"
    metaDescription="Tre piani pensati per ogni coppia: Free, Sposi e Atelier. Paghi una volta sola, nessun abbonamento, nessuna sorpresa."
  >
    <section style={{ padding: "40px 0 96px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 48px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {plans.map((p) => (
            <div
              key={p.name}
              style={{
                background: p.highlighted
                  ? "linear-gradient(165deg, #4C1D95 0%, #6D3FE0 100%)"
                  : T.surface,
                color: p.highlighted ? "#FAF7F2" : T.ink,
                borderRadius: 18,
                border: `1px solid ${p.highlighted ? "transparent" : T.border}`,
                padding: "32px 28px",
                position: "relative",
                boxShadow: p.highlighted
                  ? "0 24px 48px -16px rgba(76,29,149,.4)"
                  : T.shadowSm,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                transform: p.highlighted ? "scale(1.03)" : "none",
              }}
            >
              {p.highlighted && (
                <div
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgba(245,239,225,.18)",
                    color: "#F5EFE1",
                    border: "1px solid rgba(245,239,225,.25)",
                  }}
                >
                  {p.tag}
                </div>
              )}
              <div>
                {!p.highlighted && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: T.ink3,
                      marginBottom: 6,
                    }}
                  >
                    {p.tag}
                  </div>
                )}
                <h2
                  style={{
                    fontFamily: T.fontSerif,
                    fontWeight: 500,
                    fontSize: 30,
                    letterSpacing: "-0.015em",
                    margin: 0,
                    color: p.highlighted ? "#FAF7F2" : T.ink,
                  }}
                >
                  {p.name}
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: p.highlighted ? "rgba(250,247,242,.78)" : T.ink2,
                    margin: "8px 0 0",
                  }}
                >
                  {p.desc}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: p.highlighted ? "rgba(250,247,242,.65)" : T.ink3,
                  }}
                >
                  €
                </span>
                <span
                  style={{
                    fontFamily: T.fontSerif,
                    fontSize: 56,
                    fontWeight: 500,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    color: p.highlighted ? "#FAF7F2" : T.ink,
                  }}
                >
                  {p.price}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: p.highlighted ? "rgba(250,247,242,.6)" : T.ink3,
                    marginLeft: 4,
                  }}
                >
                  una tantum
                </span>
              </div>
              <div
                style={{
                  height: 1,
                  background: p.highlighted ? "rgba(245,239,225,.18)" : T.border,
                }}
              />
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {p.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      fontSize: 14,
                      color: p.highlighted ? "rgba(250,247,242,.88)" : T.ink2,
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: p.highlighted ? "rgba(245,239,225,.18)" : T.brandTint,
                        color: p.highlighted ? "#F5EFE1" : T.brandDeep,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        flexShrink: 0,
                        transform: "translateY(-1px)",
                      }}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "13px 18px",
                  borderRadius: 11,
                  fontSize: 14,
                  fontWeight: 600,
                  background: p.highlighted ? "#FAF7F2" : T.ink,
                  color: p.highlighted ? T.brandDeep : "#FAF7F2",
                }}
              >
                {p.cta} <span style={{ fontSize: 12 }}>→</span>
              </Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 96 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2
              style={{
                fontFamily: T.fontSerif,
                fontWeight: 400,
                fontSize: 36,
                letterSpacing: "-0.02em",
                margin: 0,
                color: T.ink,
              }}
            >
              Domande frequenti
            </h2>
          </div>
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  </ContentPageShell>
);

export default Prezzi;
