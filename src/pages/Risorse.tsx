import ContentPageShell from "@/components/landing/ContentPageShell";
import { T } from "@/components/landing/LandingTokens";

const featured = {
  cat: "Guida principale",
  title: "Il manuale del matrimonio sereno",
  read: "15 min",
  desc: "Una guida completa che ti accompagna dal primo annuncio alla luna di miele. Scadenze, decisioni, errori da evitare.",
};

const articles = [
  { cat: "Budget", title: "Come dividere il budget per categoria senza sbagliare", read: "8 min" },
  { cat: "Invitati", title: "Lista invitati: 7 regole per non scontentare nessuno", read: "6 min" },
  { cat: "Fornitori", title: "Cosa chiedere a un fotografo prima di firmare", read: "10 min" },
  { cat: "Cerimonia", title: "Letture e canti per la messa: la guida liturgica", read: "12 min" },
  { cat: "Tavoli", title: "Disposizione tavoli: matematica e diplomazia", read: "7 min" },
  { cat: "Stress", title: "Le 3 settimane più dure: come superarle", read: "5 min" },
];

const ARTICLE_GRADIENTS = [
  "linear-gradient(135deg,#F3EEFF 0%,#D8C5FF 100%)",
  "linear-gradient(135deg,#F5EFE1 0%,#E7D9BA 100%)",
  "linear-gradient(135deg,#E7F3EC 0%,#B6D8C0 100%)",
  "linear-gradient(135deg,#FBF0DF 0%,#F0DDB0 100%)",
  "linear-gradient(135deg,#E8EEFB 0%,#C4D4F2 100%)",
  "linear-gradient(135deg,#FBEAEA 0%,#EFC4C4 100%)",
];

const tools = [
  { ico: "📋", title: "Template checklist", desc: "Scarica la checklist standard 12-mesi in PDF." },
  { ico: "📊", title: "Calcolatore budget", desc: "Stima realistica del budget per regione e numero invitati." },
  { ico: "✉", title: "Modelli partecipazione", desc: "6 modelli di testo per partecipazioni, save the date e RSVP." },
];

const Risorse = () => (
  <ContentPageShell
    active="risorse"
    eyebrow="Risorse"
    heroTitle={
      <>
        Tutto quello che{" "}
        <em style={{ fontStyle: "italic", color: T.brandInk }}>vorresti sapere.</em>
      </>
    }
    heroLede="Articoli, guide e strumenti gratuiti scritti da chi ha già organizzato (e sopravvissuto a) un matrimonio."
    metaTitle="Risorse — WedsApp"
    metaDescription="Guide, articoli e strumenti gratuiti per organizzare il tuo matrimonio: budget, invitati, fornitori, cerimonia, tavoli e gestione dello stress."
  >
    <section style={{ padding: "40px 0 64px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 48px" }}>
        {/* Featured */}
        <a
          href="#"
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 32,
            background: T.surface,
            borderRadius: 18,
            border: `1px solid ${T.border}`,
            padding: 36,
            marginBottom: 40,
            boxShadow: T.shadow,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 600,
                color: T.brandInk,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: T.brandTint,
                padding: "5px 11px",
                borderRadius: 999,
                border: "1px solid rgba(139,92,246,.18)",
                marginBottom: 14,
              }}
            >
              ★ {featured.cat}
            </div>
            <h2
              style={{
                fontFamily: T.fontSerif,
                fontWeight: 400,
                fontSize: 36,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                margin: "0 0 14px",
                color: T.ink,
              }}
            >
              {featured.title}
            </h2>
            <p style={{ fontSize: 16, color: T.ink2, margin: "0 0 18px", lineHeight: 1.6 }}>
              {featured.desc}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 13, color: T.ink3, fontFamily: T.fontMono }}>
                {featured.read} di lettura
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.brandInk }}>
                Leggi la guida →
              </span>
            </div>
          </div>
          <div
            style={{
              aspectRatio: "4/3",
              borderRadius: 14,
              overflow: "hidden",
              background: "linear-gradient(135deg, #4C1D95 0%, #6D3FE0 100%)",
              display: "grid",
              placeItems: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 30% 30%, rgba(245,239,225,.2) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(176,138,62,.3) 0%, transparent 55%)",
              }}
            />
            <div
              style={{
                position: "relative",
                fontFamily: T.fontSerif,
                fontStyle: "italic",
                fontSize: 96,
                fontWeight: 500,
                color: "#F5EFE1",
                letterSpacing: "-0.04em",
              }}
            >
              W
            </div>
          </div>
        </a>

        {/* Articles header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 22,
          }}
        >
          <h3
            style={{
              fontFamily: T.fontSerif,
              fontWeight: 500,
              fontSize: 24,
              margin: 0,
              color: T.ink,
            }}
          >
            Articoli recenti
          </h3>
          <a href="#" style={{ fontSize: 13, fontWeight: 500, color: T.brandInk }}>
            Vedi tutti →
          </a>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 80,
          }}
        >
          {articles.map((a, i) => (
            <a
              key={a.title}
              href="#"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: T.surface,
                borderRadius: 14,
                border: `1px solid ${T.border}`,
                padding: 22,
                boxShadow: T.shadowSm,
              }}
            >
              <div
                style={{
                  aspectRatio: "16/10",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: ARTICLE_GRADIENTS[i % ARTICLE_GRADIENTS.length],
                  display: "grid",
                  placeItems: "center",
                  fontFamily: T.fontSerif,
                  fontStyle: "italic",
                  fontSize: 36,
                  fontWeight: 500,
                  color: T.ink,
                  opacity: 0.55,
                }}
              >
                {a.cat[0]}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.brandInk,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  {a.cat}
                </div>
                <h4
                  style={{
                    fontFamily: T.fontSerif,
                    fontWeight: 500,
                    fontSize: 18,
                    lineHeight: 1.3,
                    letterSpacing: "-0.01em",
                    margin: "0 0 10px",
                    color: T.ink,
                  }}
                >
                  {a.title}
                </h4>
                <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.fontMono }}>
                  {a.read}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Tools */}
        <div style={{ marginBottom: 22 }}>
          <h3
            style={{
              fontFamily: T.fontSerif,
              fontWeight: 500,
              fontSize: 24,
              margin: 0,
              color: T.ink,
            }}
          >
            Strumenti gratuiti
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {tools.map((t) => (
            <a
              key={t.title}
              href="#"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: T.surface,
                borderRadius: 14,
                border: `1px solid ${T.border}`,
                padding: "24px 22px",
                boxShadow: T.shadowSm,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #F3EEFF 0%, #E9DEFF 100%)",
                  border: "1px solid rgba(139,92,246,.2)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 22,
                }}
              >
                {t.ico}
              </div>
              <h4
                style={{
                  fontFamily: T.fontSerif,
                  fontWeight: 500,
                  fontSize: 18,
                  margin: 0,
                  color: T.ink,
                }}
              >
                {t.title}
              </h4>
              <p style={{ fontSize: 13.5, color: T.ink2, margin: 0, lineHeight: 1.55 }}>{t.desc}</p>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.brandInk,
                  marginTop: "auto",
                }}
              >
                Scarica →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  </ContentPageShell>
);

export default Risorse;
