// Headcount bar shown under the Hero on the Budget page.
// - In "planned" mode it lets the user edit target_adults/children/staff
//   directly (debounced save to weddings table).
// - In "expected" / "confirmed" it shows the same numbers in read-only mode
//   with a clear source label ("Da lista invitati" / "Da RSVP confermati").
import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Baby, Briefcase, Lock, Pencil, Check } from 'lucide-react';
import { FONT_UI, FONT_SERIF, ink, surface, border, brand } from './paperPrimitives';
import type { ScenarioMode } from './ScenarioSelector';

interface Counts { adults: number; children: number; staff: number }

interface Props {
  mode: ScenarioMode;
  weddingId: string;
  counts: { planned: Counts; expected: Counts; confirmed: Counts } | null;
  onPlannedSaved: () => void;
}

const SOURCE_LABEL: Record<ScenarioMode, string> = {
  planned: 'Stima manuale modificabile',
  expected: 'Da lista invitati (sposi inclusi)',
  confirmed: 'Da RSVP confermati',
};

export function ScenarioHeadcountBar({ mode, weddingId, counts, onPlannedSaved }: Props) {
  const isReadOnly = mode !== 'planned';
  const display = counts?.[mode] ?? { adults: 0, children: 0, staff: 0 };

  // Local editable state mirrors planned counts coming from props.
  const [local, setLocal] = React.useState<Counts>(counts?.planned ?? { adults: 100, children: 0, staff: 0 });
  const [saving, setSaving] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (counts?.planned) setLocal(counts.planned);
  }, [counts?.planned.adults, counts?.planned.children, counts?.planned.staff]);

  const persist = React.useCallback(async (next: Counts) => {
    if (!weddingId) return;
    setSaving(true);
    const { error } = await supabase
      .from('weddings')
      .update({
        target_adults: next.adults,
        target_children: next.children,
        target_staff: next.staff,
      })
      .eq('id', weddingId);
    setSaving(false);
    if (error) {
      toast.error('Impossibile salvare i target: ' + error.message);
      return;
    }
    onPlannedSaved();
  }, [weddingId, onPlannedSaved]);

  const onChange = (key: keyof Counts, raw: string) => {
    if (isReadOnly) return;
    const num = Math.max(0, Number.parseInt(raw, 10) || 0);
    const next = { ...local, [key]: num };
    setLocal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(next), 600);
  };

  const value = (key: keyof Counts) => (isReadOnly ? display[key] : local[key]);
  const total = display.adults + display.children + display.staff;

  return (
    <div
      style={{
        background: surface(),
        border: `1px solid ${border()}`,
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        flexWrap: 'wrap',
        boxShadow: '0 1px 2px rgba(43,37,32,.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: 8,
            background: brand('tint'), color: brand('ink'),
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${border()}`,
          }}
        >
          {isReadOnly ? <Lock size={15} /> : <Pencil size={15} />}
        </div>
        <div>
          <div style={{
            fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: ink(3), fontFamily: FONT_UI, fontWeight: 600,
          }}>
            Teste su cui calcolare
          </div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 16, color: ink(), lineHeight: 1.1, marginTop: 2 }}>
            {total} persone <span style={{ fontFamily: FONT_UI, fontSize: 11, color: ink(3), fontWeight: 500 }}>· {SOURCE_LABEL[mode]}</span>
          </div>
        </div>
      </div>

      <Field
        icon={<Users size={14} />}
        label="Adulti"
        value={value('adults')}
        readOnly={isReadOnly}
        onChange={(v) => onChange('adults', v)}
      />
      <Field
        icon={<Baby size={14} />}
        label="Bambini"
        value={value('children')}
        readOnly={isReadOnly}
        onChange={(v) => onChange('children', v)}
      />
      <Field
        icon={<Briefcase size={14} />}
        label="Staff"
        value={value('staff')}
        readOnly={isReadOnly}
        onChange={(v) => onChange('staff', v)}
      />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: ink(3), fontSize: 12, fontFamily: FONT_UI }}>
        {!isReadOnly && (saving
          ? <>Salvataggio…</>
          : <><Check size={14} style={{ color: 'hsl(var(--paper-success))' }} /> Modifiche salvate automaticamente</>
        )}
        {isReadOnly && <>Numeri di sola lettura — passa a <strong style={{ color: ink(2), marginLeft: 3 }}>Pianificato</strong> per modificare.</>}
      </div>
    </div>
  );
}

function Field({
  icon, label, value, readOnly, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  readOnly: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: ink(2), fontFamily: FONT_UI, fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {icon} {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 70, padding: '6px 10px', borderRadius: 8,
          border: `1px solid ${border()}`,
          background: readOnly ? surface('muted') : surface(),
          color: readOnly ? ink(2) : ink(),
          fontFamily: FONT_UI, fontSize: 14, fontWeight: 600,
          textAlign: 'right',
          cursor: readOnly ? 'not-allowed' : 'text',
          outline: 'none',
        }}
      />
    </label>
  );
}
