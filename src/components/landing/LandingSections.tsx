import { ReactNode } from "react";
import { T } from "./LandingTokens";

export const SectionEyebrow = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 11,
      fontWeight: 600,
      color: T.brandInk,
      textTransform: "uppercase",
      letterSpacing: "0.14em",
      padding: "5px 11px",
      borderRadius: 999,
      background: T.brandTint,
      border: "1px solid rgba(139,92,246,.18)",
    }}
  >
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.brand }} />
    {children}
  </div>
);

export const SectionTitle = ({
  eyebrow,
  title,
  lede,
  align = "left",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 18,
      alignItems: align === "center" ? "center" : "flex-start",
      textAlign: align,
    }}
  >
    {eyebrow && <SectionEyebrow>{eyebrow}</SectionEyebrow>}
    <h2
      style={{
        fontFamily: T.fontSerif,
        fontWeight: 400,
        fontSize: 44,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        margin: 0,
        color: T.ink,
        maxWidth: align === "center" ? 720 : 640,
      }}
    >
      {title}
    </h2>
    {lede && (
      <p
        style={{
          fontSize: 17,
          lineHeight: 1.55,
          color: T.ink2,
          margin: 0,
          maxWidth: align === "center" ? 640 : 560,
          textWrap: "pretty" as React.CSSProperties["textWrap"],
        }}
      >
        {lede}
      </p>
    )}
  </div>
);

// ——— Mock UI fragments
const MockBudget = () => {
  const cats = [
    { name: "Location", spent: 12000, total: 14000, color: T.brand },
    { name: "Catering", spent: 8400, total: 10000, color: T.gold },
    { name: "Fotografo", spent: 3400, total: 5000, color: "#C084FC" },
    { name: "Fiori", spent: 1800, total: 3500, color: "#F59E0B" },
    { name: "Musica", spent: 1200, total: 2000, color: "#06B6D4" },
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Spese totali
          </div>
          <div style={{ fontFamily: T.fontMono, fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 4 }}>
            € 26.800 <span style={{ fontSize: 14, color: T.ink3 }}>/ 34.500</span>
          </div>
        </div>
        <span
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: T.successTint,
            color: T.success,
          }}
        >
          78% allocato
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cats.map((c) => {
          const pct = Math.round((c.spent / c.total) * 100);
          return (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 78, fontSize: 12, color: T.ink2, fontWeight: 500 }}>{c.name}</div>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: T.surfaceSunk, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: c.color, borderRadius: 4 }} />
              </div>
              <div style={{ width: 88, fontFamily: T.fontMono, fontSize: 11, color: T.ink3, textAlign: "right" }}>
                € {c.spent.toLocaleString("it-IT")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type GS = "ok" | "pending" | "no";
const MockGuests = () => {
  const rows: { name: string; table: string; status: GS }[] = [
    { name: "Sofia Ricci", table: "Famiglia sposa", status: "ok" },
    { name: "Luca Martini", table: "Amici storici", status: "ok" },
    { name: "Anna Pellegrini", table: "Famiglia sposa", status: "pending" },
    { name: "Marco Valli", table: "Colleghi", status: "ok" },
    { name: "Famiglia Bianchi", table: "Famiglia sposo", status: "ok" },
    { name: "Giorgio Neri", table: "Amici storici", status: "no" },
  ];
  const statusMap: Record<GS, { label: string; bg: string; ink: string }> = {
    ok: { label: "Conferma", bg: T.successTint, ink: T.success },
    pending: { label: "In attesa", bg: T.warnTint, ink: T.warn },
    no: { label: "Non viene", bg: T.surfaceSunk, ink: T.ink3 },
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
        {([
          ["Tutti", 130, false],
          ["Conferma", 94, true],
          ["In attesa", 28, false],
          ["Non viene", 8, false],
        ] as const).map(([l, n, active]) => (
          <div
            key={l}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              background: active ? T.ink : T.surfaceMuted,
              color: active ? T.bg : T.ink2,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {l}
            <span style={{ fontSize: 10, opacity: 0.7, fontFamily: T.fontMono }}>{n}</span>
          </div>
        ))}
      </div>
      <div>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: i < rows.length - 1 ? `1px dashed ${T.border}` : "none",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: T.brandTint,
                color: T.brandDeep,
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 600,
                marginRight: 10,
              }}
            >
              {r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: T.ink3 }}>{r.table}</div>
            </div>
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 500,
                background: statusMap[r.status].bg,
                color: statusMap[r.status].ink,
              }}
            >
              {statusMap[r.status].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockChecklist = () => {
  const groups = [
    {
      when: "6 mesi prima",
      items: [
        { t: "Inviare partecipazioni", d: true },
        { t: "Confermare fiorista", d: true },
        { t: "Prenotare viaggio di nozze", d: false },
      ],
    },
    {
      when: "3 mesi prima",
      items: [
        { t: "Prova abito", d: false },
        { t: "Menù finale con catering", d: false },
        { t: "Bomboniere", d: false },
      ],
    },
    {
      when: "1 mese prima",
      items: [
        { t: "Conferma numero invitati", d: false },
        { t: "Brief fotografo", d: false },
      ],
    },
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>
          Le prossime cose
        </div>
        <span style={{ fontSize: 11, color: T.ink3, fontFamily: T.fontMono }}>47 giorni</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {groups.map((g, i) => (
          <div key={i}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: T.brandInk,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              {g.when}
            </div>
            {g.items.map((it, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <span
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 4,
                    border: it.d ? "none" : `1.5px solid ${T.borderStrong}`,
                    background: it.d ? T.brand : "transparent",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  {it.d && "✓"}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    color: it.d ? T.ink3 : T.ink,
                    textDecoration: it.d ? "line-through" : "none",
                  }}
                >
                  {it.t}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const MockFrame = ({ kind }: { kind: "mockBudget" | "mockGuests" | "mockChecklist" }) => (
  <div
    style={{
      background: T.surface,
      borderRadius: 16,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadowLg,
      overflow: "hidden",
      position: "relative",
    }}
  >
    <div
      style={{
        height: 34,
        background: T.surfaceMuted,
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 14px",
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#D4C9B5" }} />
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#D4C9B5" }} />
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#D4C9B5" }} />
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 10, fontFamily: T.fontMono, color: T.ink3 }}>wedsapp.it/app</span>
    </div>
    <div style={{ padding: 20, minHeight: 280 }}>
      {kind === "mockBudget" && <MockBudget />}
      {kind === "mockGuests" && <MockGuests />}
      {kind === "mockChecklist" && <MockChecklist />}
    </div>
  </div>
);

// ——— Sezioni
export const ValueSection = () => {
  const items: { eyebrow: string; title: string; body: string; page: "mockBudget" | "mockGuests" | "mockChecklist" }[] = [
    {
      eyebrow: "Centralizzare",
      title: "Una sola fonte di verità, per tutto.",
      body: "Budget, invitati, fornitori, contratti e scadenze in un unico posto. Niente più cartelle sparse, PDF perduti o messaggi WhatsApp che si accumulano. Apri WedsApp e sai esattamente a che punto sei.",
      page: "mockBudget",
    },
    {
      eyebrow: "Automatizzare",
      title: "Il lavoro ripetitivo lo facciamo noi.",
      body: "I totali si aggiornano da soli. Gli RSVP entrano automaticamente. I promemoria arrivano prima che ti dimentichi. Tu prendi le decisioni importanti — a tutto il resto pensa l'app.",
      page: "mockGuests",
    },
    {
      eyebrow: "Prevenire",
      title: "Accorgersi dei problemi prima che succedano.",
      body: "Una checklist che sa cosa fare a 12, 6, 3 mesi dal matrimonio. Alert quando il budget sta per sforare, quando un fornitore non ha risposto, quando una scadenza si avvicina. Nessuna sorpresa l'ultimo giorno.",
      page: "mockChecklist",
    },
  ];

  return (
    <section style={{ padding: "96px 0 64px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 48px" }}>
        <div style={{ marginBottom: 64, textAlign: "center" }}>
          <div style={{ display: "inline-block" }}>
            <SectionTitle
              eyebrow="Cosa facciamo per voi"
              title={
                <>
                  Togliervi il peso dalle spalle.
                  <br />
                  <em style={{ fontStyle: "italic", color: T.brandInk }}>In tre modi molto concreti.</em>
                </>
              }
              lede="Organizzare un matrimonio è complesso. Lo strumento per farlo non dovrebbe esserlo."
              align="center"
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 96 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 72,
                alignItems: "center",
                direction: i % 2 === 1 ? "rtl" : "ltr",
              }}
            >
              <div style={{ direction: "ltr", display: "flex", flexDirection: "column", gap: 18 }}>
                <SectionEyebrow>{item.eyebrow}</SectionEyebrow>
                <h3
                  style={{
                    fontFamily: T.fontSerif,
                    fontWeight: 400,
                    fontSize: 34,
                    letterSpacing: "-0.015em",
                    lineHeight: 1.15,
                    margin: 0,
                    color: T.ink,
                    maxWidth: 420,
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: 16, color: T.ink2, margin: 0, maxWidth: 460, lineHeight: 1.6 }}>{item.body}</p>
              </div>
              <div style={{ direction: "ltr" }}>
                <MockFrame kind={item.page} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const HowItWorks = () => {
  const steps = [
    {
      n: "01",
      title: "Crea il tuo spazio",
      body: "Registrati in 30 secondi. Data del matrimonio, nomi, e lo spazio personale è pronto. Nessuna carta di credito.",
    },
    {
      n: "02",
      title: "Popola e organizza",
      body: "Aggiungi invitati, fornitori, spese. La checklist intelligente ti guida passo passo, i calcoli si fanno da soli.",
    },
    {
      n: "03",
      title: "Vivi il giorno sereno",
      body: "Al giorno del matrimonio hai tutto sotto controllo. Timeline, contatti fornitori, dettagli — tutto a portata di mano.",
    },
  ];

  return (
    <section style={{ background: T.bgDeep, padding: "96px 0", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          background: "radial-gradient(circle, rgba(176,138,62,.10) 0%, transparent 70%)",
        }}
      />
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 48px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ display: "inline-block" }}>
            <SectionTitle
              eyebrow="Come funziona"
              title={
                <>
                  Tre passi, poi <em style={{ fontStyle: "italic", color: T.brandInk }}>respiri</em>.
                </>
              }
              align="center"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: 48,
              left: "16%",
              right: "16%",
              height: 1,
              background: `repeating-linear-gradient(90deg, ${T.borderStrong} 0 6px, transparent 6px 14px)`,
            }}
          />
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                background: T.surface,
                borderRadius: 16,
                border: `1px solid ${T.border}`,
                padding: "32px 28px",
                position: "relative",
                boxShadow: T.shadowSm,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #F3EEFF 0%, #E9DEFF 100%)",
                  color: T.brandDeep,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: T.fontSerif,
                  fontSize: 18,
                  fontWeight: 500,
                  fontStyle: "italic",
                  letterSpacing: "-0.02em",
                  marginBottom: 18,
                  border: "1px solid rgba(139,92,246,.2)",
                }}
              >
                {s.n}
              </div>
              <h3
                style={{
                  fontFamily: T.fontSerif,
                  fontWeight: 500,
                  fontSize: 22,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  margin: 0,
                  color: T.ink,
                }}
              >
                {s.title}
              </h3>
              <p style={{ fontSize: 14.5, color: T.ink2, marginTop: 10, marginBottom: 0, lineHeight: 1.55 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FinalCTA = () => (
  <section style={{ padding: "96px 0" }}>
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 48px" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #4C1D95 0%, #6D3FE0 55%, #8B5CF6 100%)",
          borderRadius: 24,
          padding: "64px 56px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 24px 64px -20px rgba(76,29,149,.4)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 260,
            height: 260,
            background: "radial-gradient(circle, rgba(245,239,225,.22) 0%, transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -40,
            width: 300,
            height: 300,
            background: "radial-gradient(circle, rgba(176,138,62,.25) 0%, transparent 70%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(250,247,242,.12)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(250,247,242,.2)",
              fontSize: 12,
              fontWeight: 600,
              color: "#FAF7F2",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            <span>✦</span> Inizia ora, gratis
          </div>
          <h2
            style={{
              fontFamily: T.fontSerif,
              fontWeight: 400,
              fontSize: 52,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              margin: 0,
              color: "#FAF7F2",
              maxWidth: 720,
            }}
          >
            Il tuo matrimonio,
            <br />
            <em style={{ fontStyle: "italic", color: "#F5EFE1" }}>davvero sotto controllo.</em>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "rgba(250,247,242,.82)",
              margin: 0,
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            30 secondi per iscrivervi. Nessuna carta di credito, nessun vincolo. Potete iniziare subito ad aggiungere
            invitati e fornitori.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
            <a
              href="/auth"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 24px",
                borderRadius: 12,
                background: "#FAF7F2",
                color: T.brandDeep,
                fontSize: 15,
                fontWeight: 600,
                boxShadow: "0 8px 24px -8px rgba(0,0,0,.25)",
              }}
            >
              Crea il tuo spazio gratis
              <span style={{ fontSize: 14 }}>→</span>
            </a>
            <a
              href="/auth"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 24px",
                borderRadius: 12,
                background: "rgba(250,247,242,.08)",
                color: "#FAF7F2",
                border: "1px solid rgba(250,247,242,.2)",
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              Ho già un account
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);
