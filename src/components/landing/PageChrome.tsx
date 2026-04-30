import { ReactNode } from "react";
import { Link } from "react-router-dom";
import LandingLogo from "./LandingLogo";
import { SectionEyebrow } from "./LandingSections";
import { T } from "./LandingTokens";

type NavKey = "funzionalita" | "come-funziona" | "prezzi" | "risorse" | null;

const NAV_ITEMS: { k: Exclude<NavKey, null>; l: string; to: string }[] = [
  { k: "funzionalita", l: "Funzionalità", to: "/funzionalita" },
  { k: "come-funziona", l: "Come funziona", to: "/come-funziona" },
  { k: "prezzi", l: "Prezzi", to: "/prezzi" },
  { k: "risorse", l: "Risorse", to: "/risorse" },
];

export const PageNav = ({ active = null }: { active?: NavKey }) => (
  <header
    style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(250,247,242,.82)",
      backdropFilter: "blur(14px)",
      borderBottom: "1px solid rgba(232,225,212,.6)",
    }}
  >
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "16px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <Link to="/" aria-label="WedsApp home">
        <LandingLogo size="sm" />
      </Link>
      <nav style={{ display: "flex", gap: 32 }}>
        {NAV_ITEMS.map((it) => {
          const isActive = active === it.k;
          return (
            <Link
              key={it.k}
              to={it.to}
              style={{
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? T.brandInk : T.ink2,
                padding: "4px 0",
                borderBottom: `2px solid ${isActive ? T.brand : "transparent"}`,
              }}
            >
              {it.l}
            </Link>
          );
        })}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link to="/auth" style={{ fontSize: 14, fontWeight: 500, color: T.ink2, padding: "8px 14px" }}>
          Accedi
        </Link>
        <Link
          to="/auth"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
            color: "#FAF7F2",
            background: T.ink,
            padding: "10px 18px",
            borderRadius: 10,
            boxShadow: "0 4px 14px -4px rgba(43,37,32,.3)",
          }}
        >
          Inizia gratis <span style={{ fontSize: 12 }}>→</span>
        </Link>
      </div>
    </div>
  </header>
);

export const PageHero = ({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: string;
}) => (
  <section style={{ position: "relative", overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,92,246,.10) 0%, transparent 65%)",
      }}
    />
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "88px 48px 56px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div style={{ display: "inline-block" }}>
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
      </div>
      <h1
        style={{
          fontFamily: T.fontSerif,
          fontWeight: 400,
          fontSize: 60,
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
          margin: "20px 0 18px",
          color: T.ink,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 18,
          color: T.ink2,
          margin: 0,
          maxWidth: 620,
          marginInline: "auto",
          lineHeight: 1.6,
        }}
      >
        {lede}
      </p>
    </div>
  </section>
);

export const LandingFooter = () => {
  const links: Record<string, { label: string; to: string }[]> = {
    Prodotto: [
      { label: "Funzionalità", to: "/funzionalita" },
      { label: "Prezzi", to: "/prezzi" },
      { label: "Come funziona", to: "/come-funziona" },
    ],
    Risorse: [
      { label: "Guide", to: "/risorse" },
      { label: "Centro assistenza", to: "/help" },
    ],
    Legale: [
      { label: "Privacy", to: "/risorse" },
      { label: "Termini", to: "/risorse" },
      { label: "Cookie", to: "/risorse" },
    ],
  };
  return (
    <footer style={{ background: "#1F1A16", color: "#E8E1D4", padding: "64px 0 32px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 48px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 48,
            marginBottom: 48,
          }}
        >
          <div>
            <LandingLogo size="md" onDark />
            <p
              style={{
                fontSize: 14,
                color: "rgba(232,225,212,.65)",
                marginTop: 16,
                maxWidth: 300,
                lineHeight: 1.55,
              }}
            >
              Il partner digitale per organizzare il matrimonio perfetto, in tutta serenità e controllo.
            </p>
          </div>
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "rgba(232,225,212,.5)",
                  marginBottom: 14,
                }}
              >
                {title}
              </div>
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
                {items.map((l) => (
                  <li key={l.label} style={{ fontSize: 14 }}>
                    <Link to={l.to} style={{ color: "rgba(232,225,212,.82)" }}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            paddingTop: 24,
            borderTop: "1px solid rgba(232,225,212,.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "rgba(232,225,212,.55)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>© {new Date().getFullYear()} WedsApp. Fatto con amore in Italia.</span>
          <span>Crittografia bancaria · GDPR · Backup automatici</span>
        </div>
      </div>
    </footer>
  );
};
