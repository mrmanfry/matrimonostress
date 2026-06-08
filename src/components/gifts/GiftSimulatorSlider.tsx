// src/components/gifts/GiftSimulatorSlider.tsx — RESTYLED (paper tokens, Fraunces)
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface Props {
  value: number;
  onChange: (v: number) => void;
  eligibleCount: number;
}

export function GiftSimulatorSlider({ value, onChange, eligibleCount }: Props) {
  return (
    <div style={{
      background: 'hsl(var(--paper-surface))',
      border: '1px solid hsl(var(--paper-border))',
      borderRadius: 14,
      boxShadow: '0 1px 2px hsl(24 14% 15% / 0.04)',
      padding: 20,
    }}>
      <h2 style={{ margin: '0 0 14px', fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 17, letterSpacing: '-0.01em', color: 'hsl(var(--paper-ink))' }}>
        Simulatore
      </h2>

      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--paper-ink-2))' }}>
            Media regalo per nucleo familiare
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Slider
              min={0}
              max={1000}
              step={50}
              value={[value]}
              onValueChange={([v]) => onChange(v)}
              className="flex-1 [&_[data-orientation]>span]:bg-[hsl(var(--paper-brand))] [&_[role=slider]]:border-[hsl(var(--paper-brand))]"
            />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'hsl(var(--paper-surface-muted))',
              border: '1px solid hsl(var(--paper-border))',
              borderRadius: 8, padding: '0 10px 0 0',
            }}>
              <Input
                type="number"
                min={0}
                max={5000}
                step={50}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-20 text-right border-0 bg-transparent font-mono focus-visible:ring-0"
              />
              <span style={{ fontSize: 13, color: 'hsl(var(--paper-ink-3))' }}>€</span>
            </div>
          </div>
        </div>

        <div style={{
          fontSize: 12, color: 'hsl(var(--paper-ink-2))', lineHeight: 1.5,
          background: 'hsl(var(--paper-brand-tint))',
          border: '1px solid hsl(258 100% 92%)',
          borderRadius: 8, padding: '10px 12px',
        }}>
          La stima si applica a <strong style={{ color: 'hsl(var(--paper-brand-ink))', fontWeight: 600 }}>{eligibleCount}</strong>{' '}
          nucle{eligibleCount === 1 ? 'o' : 'i'} familiare{eligibleCount !== 1 ? 'i' : ''} con RSVP confermato o in attesa senza regalo registrato.
        </div>
      </div>
    </div>
  );
}
