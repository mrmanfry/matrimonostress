import { T } from "./LandingTokens";

const cardBase: React.CSSProperties = {
  background: T.surface,
  borderRadius: 14,
  border: `1px solid ${T.border}`,
  boxShadow: T.shadow,
  padding: 16,
};

type Tone = "brand" | "gold" | "ok";
const KpiTile = ({
  label,
  value,
  delta,
  tone = "brand",
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: Tone;
  accent?: string;
}) => {
  const tones: Record<Tone, { bg: string; ink: string }> = {
    brand: { bg: T.brandTint, ink: T.brandDeep },
    gold: { bg: T.goldTint, ink: T.gold },
    ok: { bg: T.successTint, ink: T.success },
  };
  const tn = tones[tone];
  return (
    <div style={{ ...cardBase, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
          {label}
        </span>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 6,
            background: tn.bg,
            display: "grid",
            placeItems: "center",
            color: tn.ink,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {accent}
        </span>
      </div>
      <div style={{ fontFamily: T.fontMono, fontSize: 22, fontWeight: 500, color: T.ink, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {delta && <div style={{ fontSize: 11, color: tn.ink, fontWeight: 500 }}>{delta}</div>}
    </div>
  );
};

const BudgetBar = ({ label, spent, total, color }: { label: string; spent: number; total: number; color: string }) => {
  const pct = Math.min(100, Math.round((spent / total) * 100));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, color: T.ink2, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.ink3 }}>
          € {spent.toLocaleString("it-IT")} / {total.toLocaleString("it-IT")}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: T.surfaceSunk, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
};

type GuestStatus = "ok" | "pending" | "no";
const GuestPill = ({ name, status }: { name: string; status: GuestStatus }) => {
  const map: Record<GuestStatus, { bg: string; ink: string; dot: string }> = {
    ok: { bg: T.successTint, ink: T.success, dot: "✓" },
    pending: { bg: T.warnTint, ink: T.warn, dot: "…" },
    no: { bg: T.dangerTint, ink: T.danger, dot: "✕" },
  };
  const m = map[status];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px 5px 6px",
        borderRadius: 999,
        background: T.surface,
        border: `1px solid ${T.border}`,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: m.bg,
          color: m.ink,
          display: "grid",
          placeItems: "center",
          fontSize: 9,
          fontWeight: 700,
        }}
      >
        {m.dot}
      </span>
      {name}
    </div>
  );
};

const ChecklistRow = ({ text, done, date }: { text: string; done: boolean; date: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 2px", borderBottom: `1px dashed ${T.border}` }}>
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: 5,
        border: done ? "none" : `1.5px solid ${T.borderStrong}`,
        background: done ? T.brand : "transparent",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {done && "✓"}
    </span>
    <span
      style={{
        flex: 1,
        fontSize: 12.5,
        color: done ? T.ink3 : T.ink,
        textDecoration: done ? "line-through" : "none",
      }}
    >
      {text}
    </span>
    <span style={{ fontSize: 10, color: T.ink3, fontFamily: T.fontMono }}>{date}</span>
  </div>
);

export const HeroCollage = () => (
  <div style={{ position: "relative", width: "100%", height: 560 }}>
    {/* Soft blobs */}
    <div
      style={{
        position: "absolute",
        top: -40,
        right: -60,
        width: 280,
        height: 280,
        background: "radial-gradient(circle, rgba(139,92,246,.22) 0%, rgba(139,92,246,0) 70%)",
        filter: "blur(8px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: -30,
        left: -40,
        width: 260,
        height: 260,
        background: "radial-gradient(circle, rgba(176,138,62,.18) 0%, rgba(176,138,62,0) 70%)",
        filter: "blur(8px)",
      }}
    />

    {/* Main dashboard card */}
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 30,
        right: 30,
        ...cardBase,
        padding: 20,
        boxShadow: T.shadowLg,
        transform: "rotate(-1.2deg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>
            Giulia &amp; Marco
          </div>
          <div style={{ fontSize: 11, color: T.ink3, marginTop: 2, fontFamily: T.fontMono }}>
            14 giugno 2026 · 47 giorni
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 999,
            background: T.successTint,
            color: T.success,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.success }} />
          In linea
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        <KpiTile label="Budget" value="€ 28.400" delta="di € 42.000" tone="brand" accent="€" />
        <KpiTile label="Invitati" value="118 / 130" delta="90% conferme" tone="gold" accent="♥" />
        <KpiTile label="Fornitori" value="7 / 9" delta="2 in scelta" tone="ok" accent="✓" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <BudgetBar label="Location & catering" spent={14200} total={18000} color={T.brand} />
        <BudgetBar label="Fotografo & video" spent={3400} total={5000} color={T.gold} />
        <BudgetBar label="Fiori & allestimenti" spent={1800} total={3500} color="#C084FC" />
      </div>
    </div>

    {/* Floating checklist card */}
    <div
      style={{
        position: "absolute",
        top: 0,
        right: -14,
        width: 240,
        ...cardBase,
        boxShadow: T.shadowLg,
        transform: "rotate(2.5deg)",
        zIndex: 3,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Questa settimana
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: T.brand }}>2 / 4</span>
      </div>
      <ChecklistRow text="Conferma menù con catering" done date="lun" />
      <ChecklistRow text="Inviare save-the-date" done date="mar" />
      <ChecklistRow text="Scegliere bomboniere" done={false} date="gio" />
      <ChecklistRow text="Prova abito (finale)" done={false} date="sab" />
    </div>

    {/* Floating guests card */}
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: -20,
        width: 280,
        ...cardBase,
        boxShadow: T.shadowLg,
        transform: "rotate(-3deg)",
        zIndex: 3,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Conferme oggi
        </span>
        <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.success, fontWeight: 600 }}>+4</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        <GuestPill name="Sofia R." status="ok" />
        <GuestPill name="Luca M." status="ok" />
        <GuestPill name="Famiglia Bianchi" status="ok" />
        <GuestPill name="Anna P." status="pending" />
        <GuestPill name="Marco V." status="ok" />
      </div>
    </div>

    {/* Savings badge */}
    <div
      style={{
        position: "absolute",
        top: 230,
        right: -40,
        width: 170,
        ...cardBase,
        padding: 14,
        boxShadow: T.shadowLg,
        transform: "rotate(4deg)",
        zIndex: 4,
        background: "linear-gradient(135deg, #FBF7EC 0%, #F5EFE1 100%)",
        border: `1px solid ${T.goldBorder}`,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Risparmio stimato
      </div>
      <div
        style={{
          fontFamily: T.fontMono,
          fontSize: 22,
          fontWeight: 500,
          color: T.ink,
          marginTop: 4,
          letterSpacing: "-0.02em",
        }}
      >
        € 1.840
      </div>
      <div style={{ fontSize: 10, color: T.ink3, marginTop: 2 }}>vs. budget iniziale</div>
    </div>
  </div>
);

export default HeroCollage;
