/* Paper-themed Checklist UI building blocks (presentational only).
   Business logic lives in src/pages/Checklist.tsx. */

import { useMemo, useState } from "react";
import {
  CheckSquare, Plus, Search, Download, List as ListIcon, Layers, Calendar as CalendarIcon,
  AlertTriangle, ChevronRight, ChevronLeft, ChevronDown, X,
  FileText, Church, Utensils, Sparkles, Briefcase, Tag, Truck, Pencil, Check, Clock,
} from "lucide-react";
import { P, PRIO_MAP, AREA_CONFIGS, areaById, daysUntil, relDue, fmtDate, ownerColor } from "./paper-tokens";
import type { TaskMacroCategory } from "@/lib/taskCategories";

/* ──────────────── Helpers ──────────────── */

const ICONS = { fileText: FileText, church: Church, utensils: Utensils, sparkles: Sparkles, briefcase: Briefcase, tag: Tag, truck: Truck };

export function PaperRoot({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: P.bg, color: P.ink, fontFamily: P.fontUI, minHeight: "100%", padding: "30px 38px 60px" }}>
      <div style={{ maxWidth: 1480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
        {children}
      </div>
    </div>
  );
}

export function PrioBadge({ p }: { p?: string | null }) {
  const x = PRIO_MAP[p || "medium"] || PRIO_MAP.medium;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", background: x.tint, color: x.fg, border: `1px solid ${x.border}`, borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: x.dot }} />
      {x.label}
    </span>
  );
}

export function AssigneeBadge({ owner, partner1, partner2 }: { owner?: string | null; partner1?: string; partner2?: string }) {
  const x = ownerColor(owner, partner1, partner2);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px 2px 6px", background: P.surfaceMuted, color: P.ink2, border: `1px solid ${P.border}`, borderRadius: 999, fontSize: 11, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: x.color }} />
      {x.label}
    </span>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: "success" | "brand" | "danger" }) {
  const map = {
    success: { fg: P.success, bg: P.successTint, bd: "#C8E2CF" },
    brand: { fg: P.brandInk, bg: P.brandTint, bd: "#E3D9FB" },
    danger: { fg: P.danger, bg: P.dangerTint, bd: "#EBCFCF" },
  }[tone];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px 7px 11px", background: map.bg, color: map.fg, border: `1px solid ${map.bd}`, borderRadius: 999 }}>
      <span style={{ fontSize: 10, lineHeight: 1 }}>●</span>
      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: P.fontMono, fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/* ──────────────── Header ──────────────── */

export interface ChkStats { total: number; done: number; active: number; overdue: number; }
export interface ChkHeaderProps {
  stats: ChkStats;
  view: "list" | "category" | "calendar";
  setView: (v: "list" | "category" | "calendar") => void;
  search: string;
  setSearch: (s: string) => void;
  onNew: () => void;
  exportSlot?: React.ReactNode;
}

export function ChkHeader({ stats, view, setView, search, setSearch, onNew, exportSlot }: ChkHeaderProps) {
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const views: { id: ChkHeaderProps["view"]; label: string; Icon: typeof ListIcon }[] = [
    { id: "list", label: "Lista", Icon: ListIcon },
    { id: "category", label: "Categoria", Icon: Layers },
    { id: "calendar", label: "Calendario", Icon: CalendarIcon },
  ];
  return (
    <div className="chk-header-card" style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 14, padding: 22, boxShadow: P.shadowSm }}>
      <style>{`
        @media (max-width: 767px) {
          .chk-header-card { padding: 16px !important; }
          .chk-header-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .chk-header-side { min-width: 0 !important; align-items: stretch !important; }
          .chk-header-h1 { font-size: 22px !important; }
        }
      `}</style>
      <div className="chk-header-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "flex-start" }}>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, hsl(var(--paper-brand-tint)), #E8DFFC)", color: P.brandInk, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #E3D9FB" }}>
              <CheckSquare size={18} />
            </div>
            <h1 className="chk-header-h1" style={{ margin: 0, fontFamily: P.fontSerif, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>Checklist Matrimonio</h1>
          </div>
          <p style={{ margin: "0 0 18px", fontSize: 13.5, color: P.ink2, maxWidth: 540 }}>
            Tutto quello che serve fare prima del grande giorno, organizzato per area e priorità.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{ fontFamily: P.fontSerif, fontSize: 36, fontWeight: 500, color: P.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {stats.done}
              <span style={{ color: P.ink3, fontSize: 24 }}>/{stats.total}</span>
            </div>
            <div style={{ flex: 1, maxWidth: 360 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: P.ink3, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
                <span>Progresso</span>
                <span style={{ fontFamily: P.fontMono, color: P.brandInk, fontWeight: 600 }}>{pct}%</span>
              </div>
              <div style={{ height: 8, background: P.surfaceMuted, borderRadius: 999, border: `1px solid ${P.border}`, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${P.brand}, ${P.brandInk})`, borderRadius: 999, transition: "width .3s" }} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <MiniStat label="Completati" value={stats.done} tone="success" />
            <MiniStat label="In corso" value={stats.active} tone="brand" />
            <MiniStat label="Scaduti" value={stats.overdue} tone="danger" />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end", minWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: P.ink3, pointerEvents: "none", display: "inline-flex" }}>
                <Search size={14} />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca task…"
                style={{ width: "100%", height: 38, padding: "0 14px 0 36px", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, fontSize: 13, color: P.ink, outline: "none", fontFamily: "inherit" }}
              />
            </div>
            <button onClick={onNew} style={primaryBtn}>
              <Plus size={14} />
              Nuovo task
            </button>
          </div>

          <div style={{ display: "inline-flex", background: P.surfaceMuted, border: `1px solid ${P.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
            {views.map((v) => {
              const isActive = view === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  style={{
                    height: 30, padding: "0 11px", borderRadius: 7, fontSize: 12.5,
                    background: isActive ? P.surface : "transparent",
                    color: isActive ? P.ink : P.ink2,
                    fontWeight: isActive ? 500 : 400, border: "none", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 6,
                    boxShadow: isActive ? P.shadowSm : "none",
                    fontFamily: "inherit",
                  }}
                >
                  <v.Icon size={13} />
                  {v.label}
                </button>
              );
            })}
          </div>
          {exportSlot}
        </div>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px",
  background: P.brand, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px",
  background: "transparent", color: P.ink2, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
};

export const paperPrimaryBtn = primaryBtn;
export const paperGhostBtn = ghostBtn;

/* ──────────────── Attention block ──────────────── */

export interface ChkTask {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  due_date?: string | null;
  category?: string | null;
  assigned_to?: string | null;
  vendor_id?: string | null;
  description?: string | null;
  notes?: string | null;
  blocked_by_task_id?: string | null;
  linked_payment_id?: string | null;
}

export function AttentionBlock({ tasks, onOpenTask }: { tasks: ChkTask[]; onOpenTask: (id: string) => void }) {
  if (tasks.length === 0) return null;
  return (
    <div style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FBF0DF 100%)", border: "1px solid #EBCFCF", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <AlertTriangle size={16} color={P.danger} />
        <h3 style={{ margin: 0, fontFamily: P.fontSerif, fontSize: 15, fontWeight: 500, color: P.danger }}>Richiede attenzione</h3>
        <span style={{ fontFamily: P.fontMono, fontSize: 11, color: P.danger, fontWeight: 600, padding: "2px 8px", background: "#fff", borderRadius: 999, border: "1px solid #EBCFCF" }}>{tasks.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tasks.map((t) => {
          const rel = relDue(t.due_date);
          return (
            <button
              key={t.id}
              onClick={() => onOpenTask(t.id)}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 14, alignItems: "center",
                padding: "10px 14px", background: "rgba(255,255,255,.85)", border: "1px solid #F4D9D9",
                borderRadius: 10, cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 13.5, color: P.ink, fontWeight: 500 }}>{t.title}</span>
              <span style={{ fontSize: 11.5, color: P.danger, fontWeight: 500 }}>{rel.label}</span>
              <PrioBadge p={t.priority} />
              <ChevronRight size={14} color={P.ink3} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────── Filter bar ──────────────── */

export interface FilterBarProps {
  status: string;
  setStatus: (s: string) => void;
  area: string;
  setArea: (a: string) => void;
  count: number;
}

export function FilterBar({ status, setStatus, area, setArea, count }: FilterBarProps) {
  const statuses = [
    { id: "all", label: "Tutti" },
    { id: "pending", label: "In Sospeso" },
    { id: "overdue", label: "Scaduti" },
    { id: "completed", label: "Completati" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "inline-flex", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
        {statuses.map((s) => {
          const isActive = status === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              style={{
                height: 28, padding: "0 11px", borderRadius: 7, fontSize: 12.5,
                background: isActive ? P.brandTint : "transparent",
                color: isActive ? P.brandInk : P.ink2,
                fontWeight: isActive ? 500 : 400, border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 8px", height: 34, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10 }}>
        <span style={{ fontSize: 12, color: P.ink3, letterSpacing: "0.04em" }}>Area:</span>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          style={{ height: 28, padding: "0 4px", background: "transparent", border: "none", color: P.ink, fontSize: 12.5, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
        >
          <option value="all">Tutte</option>
          {AREA_CONFIGS.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: P.ink3 }}>{count} task</span>
    </div>
  );
}

/* ──────────────── Task row ──────────────── */

export interface TaskRowProps {
  task: ChkTask;
  vendorName?: string | null;
  partner1?: string;
  partner2?: string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

export function TaskRow({ task, vendorName, partner1, partner2, onToggle, onOpen }: TaskRowProps) {
  const rel = relDue(task.due_date);
  const isDone = task.status === "completed";
  const dueColor = isDone ? P.ink3 : rel.kind === "overdue" ? P.danger : rel.kind === "urgent" ? P.warn : P.ink2;
  return (
    <div
      id={`task-${task.id}`}
      onClick={() => onOpen(task.id)}
      style={{
        display: "grid", gridTemplateColumns: "24px 1fr auto auto", gap: 14, alignItems: "center",
        padding: "14px 16px", background: P.surface, border: `1px solid ${P.border}`,
        borderRadius: 10, cursor: "pointer", boxShadow: P.shadowSm,
        opacity: isDone ? 0.6 : 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = P.borderStrong)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = P.border)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
        style={{
          width: 20, height: 20, borderRadius: 6,
          border: isDone ? "none" : `2px solid ${P.borderStrong}`,
          background: isDone ? P.success : P.surface,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}
      >
        {isDone && <Check size={12} color="#fff" />}
      </button>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: isDone ? 400 : 500, color: P.ink, textDecoration: isDone ? "line-through" : "none" }}>
            {task.title}
          </span>
          <PrioBadge p={task.priority} />
          {task.linked_payment_id && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: P.goldTint, color: P.gold, border: `1px solid ${P.goldBorder}`, borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
              💳 Pagamento
            </span>
          )}
        </div>
        {vendorName && (
          <div style={{ fontSize: 12, color: P.ink3, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
            <Briefcase size={11} />
            {vendorName}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
        {task.due_date && <span style={{ fontFamily: P.fontMono, color: P.ink3 }}>{fmtDate(task.due_date)}</span>}
        {rel.label && <span style={{ color: dueColor, fontWeight: 500, minWidth: 96, textAlign: "right" }}>{rel.label}</span>}
      </div>

      <AssigneeBadge owner={task.assigned_to} partner1={partner1} partner2={partner2} />
    </div>
  );
}

/* ──────────────── List & Category views ──────────────── */

export function ListView({
  tasks, vendorMap, partner1, partner2, onToggle, onOpen,
}: {
  tasks: ChkTask[];
  vendorMap: Map<string, string>;
  partner1?: string; partner2?: string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tasks.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: P.ink3, fontSize: 13, background: P.surface, border: `1px dashed ${P.borderStrong}`, borderRadius: 12 }}>
          Nessun task corrisponde ai filtri.
        </div>
      )}
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          vendorName={t.vendor_id ? vendorMap.get(t.vendor_id) : null}
          partner1={partner1}
          partner2={partner2}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

export function CategoryView({
  allTasks, filteredTasks, vendorMap, partner1, partner2, onToggle, onOpen,
}: {
  allTasks: ChkTask[];
  filteredTasks: ChkTask[];
  vendorMap: Map<string, string>;
  partner1?: string; partner2?: string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const groups = AREA_CONFIGS.map((area) => {
    const all = allTasks.filter((t) => (t.category || "altro") === area.id);
    const visible = filteredTasks.filter((t) => (t.category || "altro") === area.id);
    const done = all.filter((t) => t.status === "completed").length;
    return { area, all, visible, done };
  }).filter((g) => g.all.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {groups.map((g) => {
        const pct = g.all.length ? Math.round((g.done / g.all.length) * 100) : 0;
        const Icon = ICONS[g.area.iconKey];
        return (
          <div key={g.area.id} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, overflow: "hidden", boxShadow: P.shadowSm }}>
            <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, background: g.area.tint, borderBottom: `1px solid ${g.area.border}` }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.6)", color: g.area.color, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,.8)" }}>
                <Icon size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: P.fontSerif, fontSize: 16, fontWeight: 500, color: P.ink, letterSpacing: "-0.01em" }}>{g.area.label}</div>
                <div style={{ fontSize: 11.5, color: P.ink2 }}>{g.visible.length} task visualizzati · {g.done}/{g.all.length} completati</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
                <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,.5)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: g.area.color, borderRadius: 999 }} />
                </div>
                <span style={{ fontFamily: P.fontMono, fontSize: 12, color: g.area.color, fontWeight: 600, minWidth: 42, textAlign: "right" }}>{pct}%</span>
              </div>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {g.visible.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  vendorName={t.vendor_id ? vendorMap.get(t.vendor_id) : null}
                  partner1={partner1}
                  partner2={partner2}
                  onToggle={onToggle}
                  onOpen={onOpen}
                />
              ))}
              {g.visible.length === 0 && (
                <div style={{ padding: 14, textAlign: "center", color: P.ink3, fontSize: 12.5 }}>Nessun task visibile in questa area</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────── Calendar view ──────────────── */

export function CalendarView({ tasks, onOpen }: { tasks: ChkTask[]; onOpen: (id: string) => void }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startDay = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = monthEnd.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let i = 1; i <= days; i++) cells.push(new Date(month.getFullYear(), month.getMonth(), i));
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksByDay = useMemo(() => {
    const map: Record<number, ChkTask[]> = {};
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      if (d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()) {
        const k = d.getDate();
        (map[k] = map[k] || []).push(t);
      }
    });
    return map;
  }, [tasks, month]);

  const selectedTasks = selectedDay ? (tasksByDay[selectedDay.getDate()] || []) : [];
  const monthLabel = month.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const chevBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8, background: P.surface, border: `1px solid ${P.border}`,
    display: "inline-flex", alignItems: "center", justifyContent: "center", color: P.ink2, cursor: "pointer",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16 }}>
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: 18, boxShadow: P.shadowSm }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={chevBtn}><ChevronLeft size={14} /></button>
          <div style={{ fontFamily: P.fontSerif, fontSize: 18, fontWeight: 500, textTransform: "capitalize", letterSpacing: "-0.01em" }}>{monthLabel}</div>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={chevBtn}><ChevronRight size={14} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
          {["lun", "mar", "mer", "gio", "ven", "sab", "dom"].map((d) => (
            <div key={d} style={{ fontSize: 10, color: P.ink3, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, textAlign: "center", padding: "6px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ aspectRatio: "1/1" }} />;
            const list = tasksByDay[d.getDate()] || [];
            const isToday = d.toDateString() === new Date().toDateString();
            const isSelected = selectedDay && d.toDateString() === selectedDay.toDateString();
            const hasOverdue = list.some((t) => t.status !== "completed" && relDue(t.due_date).kind === "overdue");
            const hasUrgent = list.some((t) => t.status !== "completed" && relDue(t.due_date).kind === "urgent");
            const allDone = list.length > 0 && list.every((t) => t.status === "completed");
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(d)}
                style={{
                  aspectRatio: "1/1", padding: 8, borderRadius: 8, position: "relative",
                  background: isSelected ? P.brandTint : isToday ? P.surfaceMuted : P.surface,
                  border: isSelected ? `1.5px solid ${P.brand}` : isToday ? `1px dashed ${P.borderStrong}` : `1px solid ${P.border}`,
                  cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, color: isToday ? P.brandInk : P.ink2 }}>{d.getDate()}</span>
                {list.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                    {hasOverdue && <span style={{ width: 6, height: 6, borderRadius: 999, background: P.danger }} />}
                    {hasUrgent && !hasOverdue && <span style={{ width: 6, height: 6, borderRadius: 999, background: P.warn }} />}
                    {allDone && <span style={{ width: 6, height: 6, borderRadius: 999, background: P.success }} />}
                    {!hasOverdue && !hasUrgent && !allDone && <span style={{ width: 6, height: 6, borderRadius: 999, background: P.brand }} />}
                    <span style={{ fontFamily: P.fontMono, fontSize: 10, color: P.ink3, fontWeight: 600 }}>{list.length}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 11, color: P.ink3 }}>
          {[
            { dot: P.danger, label: "Scaduto" },
            { dot: P.warn, label: "Urgente" },
            { dot: P.brand, label: "In sospeso" },
            { dot: P.success, label: "Completato" },
          ].map((x) => (
            <span key={x.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: x.dot }} />{x.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: 18, boxShadow: P.shadowSm, minHeight: 360 }}>
        {!selectedDay ? (
          <div style={{ padding: "40px 18px", textAlign: "center" }}>
            <div style={{ width: 46, height: 46, margin: "0 auto", borderRadius: "50%", background: P.surfaceMuted, color: P.ink3, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarIcon size={20} />
            </div>
            <div style={{ fontFamily: P.fontSerif, fontSize: 15, fontWeight: 500, marginTop: 12 }}>Seleziona una data</div>
            <div style={{ fontSize: 12, color: P.ink3, marginTop: 6, lineHeight: 1.5 }}>Clicca su un giorno per vedere i task programmati.</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: P.ink3, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 4 }}>
              {selectedDay.toLocaleDateString("it-IT", { weekday: "long" })}
            </div>
            <div style={{ fontFamily: P.fontSerif, fontSize: 24, fontWeight: 500, color: P.ink, letterSpacing: "-0.02em" }}>
              {fmtDate(selectedDay.toISOString())}
            </div>
            <div style={{ margin: "14px 0 8px", height: 1, background: P.border }} />
            {selectedTasks.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: P.ink3, fontSize: 13 }}>Nessun task in questa data</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedTasks.map((t) => {
                  const a = areaById(t.category);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpen(t.id)}
                      style={{
                        padding: "10px 12px", background: P.surfaceMuted, border: `1px solid ${P.border}`, borderRadius: 8,
                        cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 5, fontFamily: "inherit",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: a.color }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: P.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                        <PrioBadge p={t.priority} />
                      </div>
                      <div style={{ fontSize: 11, color: P.ink3, display: "flex", justifyContent: "space-between" }}>
                        <span>{a.label}</span>
                        <span>{t.assigned_to || "Entrambi"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── Task detail drawer (right slide-in) ──────────────── */

export interface TaskDetailDrawerProps {
  task: ChkTask | null;
  vendorName?: string | null;
  vendorCategory?: string | null;
  blockingTaskTitle?: string | null;
  blockingResolved?: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
  /** Slot for advanced editors (priority, owner, vendor, due date, payment link, dependency, notes, vendor actions). */
  expandedControls?: React.ReactNode;
}

export function TaskDetailDrawer({
  task, vendorName, vendorCategory, blockingTaskTitle, blockingResolved,
  onClose, onToggle, expandedControls,
}: TaskDetailDrawerProps) {
  if (!task) return null;
  const a = areaById(task.category);
  const Icon = ICONS[a.iconKey];
  const rel = relDue(task.due_date);
  const isDone = task.status === "completed";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", justifyContent: "flex-end", animation: "fadeIn .15s ease" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,16,12,.4)", backdropFilter: "blur(2px)" }} />
      <div
        style={{
          position: "relative", width: 480, maxWidth: "100%", height: "100vh", background: P.bg,
          borderLeft: `1px solid ${P.border}`, boxShadow: "-20px 0 40px -10px rgba(20,16,12,.18)",
          display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: P.fontUI,
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${P.border}`, background: P.surface }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", background: a.tint, color: a.color, border: `1px solid ${a.border}`, borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                  <Icon size={11} />
                  {a.label}
                </span>
                <PrioBadge p={task.priority} />
                {task.linked_payment_id && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: P.goldTint, color: P.gold, border: `1px solid ${P.goldBorder}`, borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                    💳 Pagamento
                  </span>
                )}
              </div>
              <h2 style={{ margin: 0, fontFamily: P.fontSerif, fontSize: 20, fontWeight: 500, color: P.ink, letterSpacing: "-0.01em", lineHeight: 1.25 }}>
                {task.title}
              </h2>
              {task.description && (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: P.ink2, lineHeight: 1.5 }}>{task.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${P.border}`,
                color: P.ink2, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button onClick={() => onToggle(task.id)} style={{ ...primaryBtn, height: 32, background: isDone ? P.surfaceMuted : P.brand, color: isDone ? P.ink : "#fff", border: isDone ? `1px solid ${P.border}` : "none" }}>
              <Check size={13} />
              {isDone ? "Riapri task" : "Segna completato"}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "18px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <MetaCell label="Scadenza" value={fmtDate(task.due_date)} sub={rel.label} tone={rel.kind === "overdue" ? "danger" : rel.kind === "urgent" ? "warn" : "neutral"} />
            <MetaCell label="Assegnato a" value={task.assigned_to || "Entrambi"} />
          </div>

          {vendorName && (
            <DrawerSection title="Fornitore collegato">
              <div style={{ padding: "12px 14px", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: P.brandTint, color: P.brandInk, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #E3D9FB" }}>
                    <Briefcase size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: P.ink }}>{vendorName}</div>
                    {vendorCategory && <div style={{ fontSize: 11.5, color: P.ink3 }}>{vendorCategory}</div>}
                  </div>
                </div>
              </div>
            </DrawerSection>
          )}

          {blockingTaskTitle && (
            <DrawerSection title="Dipendenza">
              <div style={{ padding: "12px 14px", background: blockingResolved ? P.successTint : P.warnTint, border: `1px solid ${blockingResolved ? "#C8E2CF" : "#ECD9B7"}`, borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {blockingResolved ? <Check size={16} color={P.success} /> : <Clock size={16} color={P.warn} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: blockingResolved ? P.success : P.warn, fontWeight: 500 }}>
                      {blockingResolved ? "Sbloccato — puoi procedere" : "Bloccato — in attesa di…"}
                    </div>
                    <div style={{ fontSize: 13, color: P.ink, marginTop: 2 }}>
                      Dipende da: <strong style={{ fontWeight: 500 }}>«{blockingTaskTitle}»</strong>
                    </div>
                  </div>
                </div>
              </div>
            </DrawerSection>
          )}

          {expandedControls && (
            <DrawerSection title="Modifica dettagli">
              <div style={{ padding: 14, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10 }}>
                {expandedControls}
              </div>
            </DrawerSection>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "danger" | "warn" | "success" }) {
  const toneFg = { neutral: P.ink, danger: P.danger, warn: P.warn, success: P.success }[tone];
  return (
    <div style={{ padding: "12px 14px", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10 }}>
      <div style={{ fontSize: 10.5, color: P.ink3, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: P.fontMono, fontSize: 13, fontWeight: 500, color: P.ink, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: toneFg, fontWeight: 500, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10.5, color: P.ink3, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
