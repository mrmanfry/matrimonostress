// Editorial card highlighting the next payment due.
import * as React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaperBadge, FONT_SERIF, FONT_UI, ink, surface, border, warn } from './paperPrimitives';
import { fmt, daysFromToday, type UiPayment, type UiVendor } from '@/lib/budgetAggregates';

interface Props {
  next: UiPayment;
  vendor: UiVendor | undefined;
  onMarkPaid?: () => void;
  onOpenVendor?: () => void;
}

export function NextPaymentCallout({ next, vendor, onMarkPaid, onOpenVendor }: Props) {
  const days = daysFromToday(next.due);
  const urgent = days <= 7;
  const dt = new Date(next.due);

  return (
    <div style={{
      background: urgent
        ? 'linear-gradient(135deg, hsl(var(--paper-warn-tint)) 0%, hsl(42 60% 92%) 100%)'
        : surface(),
      border: `1px solid ${urgent ? 'hsl(39 60% 80%)' : border()}`,
      borderRadius: 12,
      padding: '18px 24px',
      display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      fontFamily: FONT_UI,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 10, flexShrink: 0,
        background: surface(), border: `1px solid ${urgent ? 'hsl(39 60% 80%)' : border()}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 10, color: urgent ? warn() : ink(3), letterSpacing: '0.12em',
          textTransform: 'uppercase', fontWeight: 600,
        }}>
          {dt.toLocaleDateString('it-IT', { month: 'short' })}
        </div>
        <div style={{
          fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 500,
          color: urgent ? warn() : ink(), lineHeight: 1,
        }}>{dt.getDate()}</div>
        <div style={{ fontSize: 10, color: ink(3), marginTop: 2 }}>{dt.getFullYear()}</div>
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <PaperBadge tone={urgent ? 'warn' : 'brand'} size="sm">
            {days === 0 ? 'Oggi' : days === 1 ? 'Domani' : `Tra ${days} giorni`}
          </PaperBadge>
          <span style={{ fontSize: 12, color: ink(3) }}>Prossima scadenza</span>
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 500, color: ink() }}>
          {next.desc}{vendor ? ` · ${vendor.name}` : ''}
        </div>
        {vendor && (
          <div style={{ fontSize: 12, color: ink(2), marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: vendor.categoryTone }}/>
            {vendor.categoryName}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 500,
          color: urgent ? warn() : ink(), lineHeight: 1, letterSpacing: -0.5,
        }}>{fmt(next.amount)}</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {onOpenVendor && (
            <Button variant="outline" size="sm" onClick={onOpenVendor}>Dettagli</Button>
          )}
          {onMarkPaid && (
            <Button size="sm" onClick={onMarkPaid}>
              <Check className="mr-1 h-4 w-4"/> Segna pagato
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
