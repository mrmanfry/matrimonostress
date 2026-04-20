// 3-scenario toggle for the Budget page.
// Lets the user switch between Planned / Invited / Confirmed headcount basis.
import * as React from 'react';
import { FONT_UI, ink, border, surface, brand } from './paperPrimitives';

export type ScenarioMode = 'planned' | 'expected' | 'confirmed';

interface Counts {
  planned: { adults: number; children: number; staff: number };
  expected: { adults: number; children: number; staff: number };
  confirmed: { adults: number; children: number; staff: number };
}

interface Props {
  mode: ScenarioMode;
  onModeChange: (m: ScenarioMode) => void;
  counts: Counts | null;
}

const ITEMS: Array<{ id: ScenarioMode; label: string; hint: string }> = [
  { id: 'planned', label: 'Pianificato', hint: 'Stima di partenza basata sui target del matrimonio' },
  { id: 'expected', label: 'Lista invitati', hint: 'Tutti gli ospiti inseriti (esclusi i declinati)' },
  { id: 'confirmed', label: 'Confermati', hint: 'Solo RSVP confermati' },
];

export function ScenarioSelector({ mode, onModeChange, counts }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: ink(3), fontFamily: FONT_UI, fontWeight: 600,
      }}>
        Scenario
      </span>
      <div
        role="tablist"
        aria-label="Scenario di calcolo"
        style={{
          display: 'inline-flex', padding: 3, gap: 2,
          background: surface('muted'),
          border: `1px solid ${border()}`,
          borderRadius: 999,
        }}
      >
        {ITEMS.map((it) => {
          const active = mode === it.id;
          const n = counts?.[it.id]?.adults ?? 0;
          return (
            <button
              key={it.id}
              role="tab"
              aria-selected={active}
              title={it.hint}
              onClick={() => onModeChange(it.id)}
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '6px 12px', borderRadius: 999,
                border: '1px solid transparent',
                background: active ? surface() : 'transparent',
                borderColor: active ? border() : 'transparent',
                color: active ? ink() : ink(2),
                fontFamily: FONT_UI, fontSize: 12, fontWeight: active ? 600 : 500,
                boxShadow: active ? '0 1px 2px rgba(43,37,32,.06)' : 'none',
                transition: 'all .15s ease',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{it.label}</span>
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: active ? brand('ink') : ink(3),
                background: active ? brand('tint') : 'transparent',
                borderRadius: 999, padding: active ? '1px 6px' : '0',
                minWidth: 18, textAlign: 'center',
              }}>
                {n}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
