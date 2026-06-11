import { Link } from "react-router-dom";
import ContentPageShell from "@/components/landing/ContentPageShell";
import { T } from "@/components/landing/LandingTokens";
import { blogArticles } from "@/data/blogArticles";

const ARTICLE_GRADIENTS = [
  "linear-gradient(135deg,#F3EEFF 0%,#D8C5FF 100%)",
  "linear-gradient(135deg,#F5EFE1 0%,#E7D9BA 100%)",
  "linear-gradient(135deg,#E7F3EC 0%,#B6D8C0 100%)",
  "linear-gradient(135deg,#FBF0DF 0%,#F0DDB0 100%)",
  "linear-gradient(135deg,#E8EEFB 0%,#C4D4F2 100%)",
  "linear-gradient(135deg,#FBEAEA 0%,#EFC4C4 100%)",
];

const Risorse = () => {
  const hub = blogArticles.find((a) => a.isHub) ?? blogArticles[0];
  const others = blogArticles.filter((a) => a.slug !== hub.slug);

  return (
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
      metaTitle="Risorse — Guide e articoli su matrimoni | WedsApp"
      metaDescription="Guide, articoli e FAQ per organizzare il matrimonio: budget 2026, lista invitati, RSVP, fornitori, contratti, app a confronto. Scritti per coppie italiane."
    >
      <style>{`
        .risorse-wrap { max-width: 1140px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 48px); }
        .featured-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 32px; padding: clamp(20px, 4vw, 36px); }
        .articles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 860px) {
          .featured-grid { grid-template-columns: 1fr; gap: 20px; }
          .featured-art { order: -1; max-height: 220px; }
          .articles-grid { grid-template-columns: 1fr; }
        }
        @media (min-width: 861px) and (max-width: 1024px) {
          .articles-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <section style={{ padding: "40px 0 64px" }}>
        <div className="risorse-wrap">
          {/* Featured / Hub article */}
          <Link
            to={`/risorse/${hub.slug}`}
            className="featured-grid"
            style={{
              background: T.surface,
              borderRadius: 18,
              border: `1px solid ${T.border}`,
              marginBottom: 40,
              boxShadow: T.shadow,
              alignItems: "center",
              textDecoration: "none",
              color: T.ink,
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
                ★ {hub.category}
              </div>
              <h2
                style={{
                  fontFamily: T.fontSerif,
                  fontWeight: 400,
                  fontSize: "clamp(24px, 4vw, 36px)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  margin: "0 0 14px",
                  color: T.ink,
                }}
              >
                {hub.title}
              </h2>
              <p style={{ fontSize: 16, color: T.ink2, margin: "0 0 18px", lineHeight: 1.6 }}>
                {hub.description}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: T.ink3, fontFamily: T.fontMono }}>
                  {hub.readMinutes} min di lettura
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.brandInk }}>
                  Leggi la guida →
                </span>
              </div>
            </div>
            <div
              className="featured-art"
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
                  fontSize: "clamp(64px, 12vw, 96px)",
                  fontWeight: 500,
                  color: "#F5EFE1",
                  letterSpacing: "-0.04em",
                }}
              >
                W
              </div>
            </div>
          </Link>

          {/* Other articles */}
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
                fontSize: "clamp(20px, 3vw, 24px)",
                margin: 0,
                color: T.ink,
              }}
            >
              Articoli e guide
            </h3>
            <span style={{ fontSize: 13, color: T.ink3, fontFamily: T.fontMono }}>
              {others.length} articoli
            </span>
          </div>

          <div className="articles-grid">
            {others.map((a, i) => (
              <Link
                key={a.slug}
                to={`/risorse/${a.slug}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  background: T.surface,
                  borderRadius: 14,
                  border: `1px solid ${T.border}`,
                  padding: 22,
                  boxShadow: T.shadowSm,
                  textDecoration: "none",
                  color: T.ink,
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
                  {a.category[0]}
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
                    {a.category}
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
                  <p style={{ fontSize: 14, color: T.ink2, margin: "0 0 10px", lineHeight: 1.5 }}>
                    {a.description}
                  </p>
                  <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.fontMono }}>
                    {a.readMinutes} min
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </ContentPageShell>
  );
};

export default Risorse;
