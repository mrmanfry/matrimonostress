import { useEffect } from "react";
import LandingLogo from "@/components/landing/LandingLogo";
import HeroCollage from "@/components/landing/HeroCollage";
import { SectionEyebrow, ValueSection, HowItWorks, FinalCTA } from "@/components/landing/LandingSections";
import { T } from "@/components/landing/LandingTokens";

const Nav = () => (
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
      <LandingLogo size="sm" />
      <nav style={{ display: "flex", gap: 32 }}>
        {["Funzionalità", "Come funziona", "Prezzi", "Risorse"].map((l) => (
          <a key={l} href="#" style={{ fontSize: 14, fontWeight: 500, color: T.ink2 }}>
            {l}
          </a>
        ))}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <a href="/auth" style={{ fontSize: 14, fontWeight: 500, color: T.ink2, padding: "8px 14px" }}>
          Accedi
        </a>
        <a
          href="/auth"
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
          Inizia gratis
          <span style={{ fontSize: 12 }}>→</span>
        </a>
      </div>
    </div>
  </header>
);

const Hero = () => (
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
        padding: "72px 48px 96px",
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
        gap: 72,
        alignItems: "center",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <SectionEyebrow>Wedding planner digitale</SectionEyebrow>

        <h1
          style={{
            fontFamily: T.fontSerif,
            fontWeight: 400,
            fontSize: 76,
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

        <p style={{ fontSize: 19, color: T.ink2, margin: 0, maxWidth: 520, lineHeight: 1.55 }}>
          Budget, invitati, fornitori e checklist in un unico posto. Niente più fogli Excel, chat infinite e notti
          insonni — solo le cose che contano davvero.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <a
            href="/auth"
            style={{
              display: "inline-flex",
              alignItems: "center",
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
            gap: 24,
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

      <div>
        <HeroCollage />
      </div>
    </div>
  </section>
);

const Footer = () => {
  const links: Record<string, string[]> = {
    Prodotto: ["Funzionalità", "Prezzi", "Novità"],
    Risorse: ["Guida completa", "Blog", "FAQ"],
    Legale: ["Privacy", "Termini", "Cookie"],
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
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((l) => (
                  <li key={l} style={{ fontSize: 14, color: "rgba(232,225,212,.82)" }}>
                    {l}
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
