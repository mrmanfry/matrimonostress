import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import LandingLogo from "@/components/landing/LandingLogo";
import HeroCollage from "@/components/landing/HeroCollage";
import { SectionEyebrow, ValueSection, HowItWorks, FinalCTA } from "@/components/landing/LandingSections";
import { T } from "@/components/landing/LandingTokens";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV_LINKS = [
  { l: "Funzionalità", to: "/funzionalita" },
  { l: "Come funziona", to: "/come-funziona" },
  { l: "Prezzi", to: "/prezzi" },
  { l: "Risorse", to: "/risorse" },
];

const Nav = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  return (
  <header
    style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(250,247,242,.92)",
      backdropFilter: "blur(14px)",
      borderBottom: "1px solid rgba(232,225,212,.6)",
    }}
  >
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "12px 16px" : "16px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <Link to="/" aria-label="WedsApp home" style={{ display: "flex" }}>
        <LandingLogo size="sm" />
      </Link>
      {!isMobile && (
        <nav style={{ display: "flex", gap: 32 }}>
          {NAV_LINKS.map((it) => (
            <Link key={it.l} to={it.to} style={{ fontSize: 14, fontWeight: 500, color: T.ink2 }}>
              {it.l}
            </Link>
          ))}
        </nav>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!isMobile && (
          <Link to="/auth" style={{ fontSize: 14, fontWeight: 500, color: T.ink2, padding: "8px 14px" }}>
            Accedi
          </Link>
        )}
        <Link
          to="/auth"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            color: "#FAF7F2",
            background: T.ink,
            padding: isMobile ? "8px 14px" : "10px 18px",
            borderRadius: 10,
            boxShadow: "0 4px 14px -4px rgba(43,37,32,.3)",
          }}
        >
          Inizia gratis
          <span style={{ fontSize: 12 }}>→</span>
        </Link>
        {isMobile && (
          <button
            type="button"
            aria-label="Apri menu"
            onClick={() => setOpen(true)}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: 8,
              display: "inline-flex",
              color: T.ink,
              cursor: "pointer",
            }}
          >
            <Menu size={20} />
          </button>
        )}
      </div>
    </div>

    {isMobile && open && (
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => setOpen(false)}
        style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(31,26,22,.45)" }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: "min(82vw, 320px)",
            background: T.bg,
            padding: "20px 20px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            boxShadow: "-12px 0 32px rgba(0,0,0,.18)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <LandingLogo size="sm" />
            <button
              type="button"
              aria-label="Chiudi menu"
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", padding: 8, display: "inline-flex", color: T.ink, cursor: "pointer" }}
            >
              <X size={20} />
            </button>
          </div>
          {NAV_LINKS.map((it) => (
            <Link
              key={it.l}
              to={it.to}
              onClick={() => setOpen(false)}
              style={{ fontSize: 17, fontWeight: 500, color: T.ink, padding: "14px 4px", borderBottom: `1px solid ${T.border}` }}
            >
              {it.l}
            </Link>
          ))}
          <Link
            to="/auth"
            onClick={() => setOpen(false)}
            style={{ fontSize: 16, fontWeight: 500, color: T.ink2, padding: "14px 4px", borderBottom: `1px solid ${T.border}` }}
          >
            Accedi
          </Link>
          <Link
            to="/auth"
            onClick={() => setOpen(false)}
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 15,
              fontWeight: 600,
              color: "#FAF7F2",
              background: T.ink,
              padding: "12px 18px",
              borderRadius: 10,
            }}
          >
            Inizia gratis <span style={{ fontSize: 12 }}>→</span>
          </Link>
        </div>
      </div>
    )}
  </header>
  );
};

const Hero = () => {
  const isMobile = useIsMobile();
  return (
  <section style={{ position: "relative", overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse 80% 50% at 30% 0%, rgba(139,92,246,.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 90% 30%, rgba(176,138,62,.07) 0%, transparent 60%)",
      }}
    />
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "40px 20px 56px" : "72px 48px 96px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.05fr 1fr",
        gap: isMobile ? 36 : 72,
        alignItems: "center",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 26, order: isMobile ? 1 : 0 }}>
        <SectionEyebrow>Wedding planner digitale</SectionEyebrow>

        <h1
          style={{
            fontFamily: T.fontSerif,
            fontWeight: 400,
            fontSize: isMobile ? 44 : 76,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            margin: 0,
            color: T.ink,
          }}
        >
          Il tuo matrimonio,
          <br />
          <em style={{ fontStyle: "italic", color: T.brandInk }}>sotto controllo.</em>
        </h1>

        <p style={{ fontSize: isMobile ? 16 : 19, color: T.ink2, margin: 0, maxWidth: 520, lineHeight: 1.55 }}>
          Budget, invitati, fornitori e checklist in un unico posto. Niente più fogli Excel, chat infinite e notti
          insonni — solo le cose che contano davvero.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 12,
            marginTop: 8,
            flexWrap: "wrap",
            alignItems: isMobile ? "stretch" : "center",
          }}
        >
          <a
            href="/auth"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "15px 24px",
              borderRadius: 12,
              background: T.ink,
              color: "#FAF7F2",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 8px 24px -8px rgba(43,37,32,.3)",
            }}
          >
            Inizia gratis
            <span style={{ fontSize: 13 }}>→</span>
          </a>
          <a
            href="#come-funziona"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "15px 22px",
              borderRadius: 12,
              background: T.surface,
              color: T.ink,
              border: `1px solid ${T.borderStrong}`,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            Scopri come funziona
          </a>
        </div>

        <div
          style={{
            display: "flex",
            gap: isMobile ? 16 : 24,
            marginTop: 18,
            paddingTop: 24,
            borderTop: `1px dashed ${T.border}`,
            flexWrap: "wrap",
          }}
        >
          {[
            { t: "30 secondi", l: "per iniziare" },
            { t: "Nessuna carta", l: "di credito richiesta" },
            { t: "GDPR + Italia", l: "dati protetti" },
          ].map((f) => (
            <div key={f.t} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontFamily: T.fontSerif,
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: T.ink,
                }}
              >
                {f.t}
              </span>
              <span style={{ fontSize: 12, color: T.ink3 }}>{f.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ order: isMobile ? 2 : 0 }}>
        <HeroCollage />
      </div>
    </div>
  </section>
  );
};

const Footer = () => {
  const isMobile = useIsMobile();
  const links: Record<string, { label: string; to: string }[]> = {
    Prodotto: [
      { label: "Funzionalità", to: "/funzionalita" },
      { label: "Prezzi", to: "/prezzi" },
      { label: "Come funziona", to: "/come-funziona" },
    ],
    Risorse: [
      { label: "Guide", to: "/risorse" },
      { label: "Centro assistenza", to: "/help" },
      { label: "FAQ", to: "/risorse" },
    ],
    Legale: [
      { label: "Privacy", to: "/risorse" },
      { label: "Termini", to: "/risorse" },
      { label: "Cookie", to: "/risorse" },
    ],
  };
  return (
    <footer style={{ background: "#1F1A16", color: "#E8E1D4", padding: isMobile ? "48px 0 24px" : "64px 0 32px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: isMobile ? "0 20px" : "0 48px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "1.5fr 1fr 1fr 1fr",
            gap: isMobile ? 28 : 48,
            marginBottom: isMobile ? 32 : 48,
          }}
        >
          <div style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}>
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
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
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
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            fontSize: 12,
            color: "rgba(232,225,212,.55)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>© {new Date().getFullYear()} WedsApp. Fatto con amore in Italia.</span>
          <span>Crittografia bancaria · GDPR · Backup automatici</span>
        </div>
      </div>
    </footer>
  );
};

const Index = () => {
  // SEO basics
  useEffect(() => {
    document.title = "WedsApp — Il tuo matrimonio, sotto controllo.";
    const meta =
      document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    meta.setAttribute(
      "content",
      "Budget, invitati, fornitori e checklist in un unico posto. WedsApp è il wedding planner digitale per organizzare il matrimonio senza stress.",
    );
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  return (
    <div
      style={{
        background: T.bg,
        color: T.ink,
        fontFamily: T.fontUi,
        fontSize: 15,
        lineHeight: 1.55,
        WebkitFontSmoothing: "antialiased",
        minHeight: "100vh",
      }}
    >
      <Nav />
      <main>
        <Hero />
        <div id="valore">
          <ValueSection />
        </div>
        <div id="come-funziona">
          <HowItWorks />
        </div>
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
