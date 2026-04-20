// Budget page primitives — shared by the new unified Budget view.
// These wrap the design tokens (--paper-*) defined in src/index.css.
import * as React from 'react';

type ChildrenOnly = { children?: React.ReactNode };

export const ink = (n: 1 | 2 | 3 = 1) => `hsl(var(--paper-ink${n === 1 ? '' : `-${n}`}))`;
export const surface = (kind: 'default' | 'muted' | 'sunk' = 'default') =>
  kind === 'default' ? 'hsl(var(--paper-surface))'
    : kind === 'muted' ? 'hsl(var(--paper-surface-muted))'
    : 'hsl(36 30% 90%)';
export const border = (strong = false) =>
  strong ? 'hsl(var(--paper-border-strong))' : 'hsl(var(--paper-border))';
export const brand = (kind: 'base' | 'ink' | 'tint' = 'base') =>
  kind === 'base' ? 'hsl(var(--paper-brand))'
    : kind === 'ink' ? 'hsl(var(--paper-brand-ink))'
    : 'hsl(var(--paper-brand-tint))';
export const success = (tint = false) => tint ? 'hsl(var(--paper-success-tint))' : 'hsl(var(--paper-success))';
export const warn = (tint = false) => tint ? 'hsl(var(--paper-warn-tint))' : 'hsl(var(--paper-warn))';
export const danger = (tint = false) => tint ? 'hsl(var(--paper-danger-tint))' : 'hsl(var(--paper-danger))';

export const FONT_SERIF = "'Fraunces', 'EB Garamond', Georgia, serif";
export const FONT_UI = "'Inter', 'Lato', system-ui, sans-serif";
export const FONT_MONO = "'JetBrains Mono', 'Fira Code', ui-monospace, monospace";

interface CardProps extends ChildrenOnly {
  padding?: number | string;
  style?: React.CSSProperties;
  className?: string;
}
export const PaperCard: React.FC<CardProps> = ({ children, padding = 20, style, className }) => (
  <div
    className={className}
    style={{
      background: surface(),
      border: `1px solid ${border()}`,
      borderRadius: 12,
      padding,
      boxShadow: '0 1px 2px rgba(43,37,32,.04), 0 1px 1px rgba(43,37,32,.03)',
      ...style,
    }}
  >
    {children}
  </div>
);

type Tone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger' | 'gold';
const toneStyles: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: surface('muted'), fg: ink(2), border: border() },
  brand: { bg: brand('tint'), fg: brand('ink'), border: 'hsl(258 77% 89%)' },
  success: { bg: success(true), fg: success(), border: 'hsl(138 30% 80%)' },
  warn: { bg: warn(true), fg: warn(), border: 'hsl(39 60% 80%)' },
  danger: { bg: danger(true), fg: danger(), border: 'hsl(0 50% 85%)' },
  gold: { bg: 'hsl(42 60% 90%)', fg: '#6B4F1D', border: 'hsl(42 50% 80%)' },
};

export const PaperBadge: React.FC<{ tone?: Tone; size?: 'sm' | 'md'; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ tone = 'neutral', size = 'md', children, style }) => {
    const t = toneStyles[tone];
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: size === 'sm' ? 18 : 22,
        padding: size === 'sm' ? '0 6px' : '0 8px',
        fontSize: size === 'sm' ? 11 : 12, fontWeight: 500,
        background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
        borderRadius: 6, fontFamily: FONT_UI, ...style,
      }}>{children}</span>
    );
  };

export const LegendDot: React.FC<{ color: string; label: string; outline?: boolean }> = ({ color, label, outline }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT_UI }}>
    <span style={{
      width: 8, height: 8, borderRadius: 2, background: color,
      border: outline ? `1px solid ${border(true)}` : 'none',
    }}/>
    {label}
  </span>
);

export const SectionLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    fontSize: 11, color: ink(3), letterSpacing: '0.12em',
    textTransform: 'uppercase', marginBottom: 10, fontWeight: 600, fontFamily: FONT_UI, ...style,
  }}>{children}</div>
);
