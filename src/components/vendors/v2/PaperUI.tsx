// Additional Paper UI primitives for the Vendors v2 redesign.
// Built on top of `src/components/budget/v2/paperPrimitives.tsx`.
import * as React from 'react';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ink, surface, border, brand, success, warn,
  FONT_SERIF, FONT_UI, FONT_MONO,
} from '@/components/budget/v2/paperPrimitives';

export { ink, surface, border, brand, success, warn, FONT_SERIF, FONT_UI, FONT_MONO };

// ─── Modal ───
export const PaperModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ open, onClose, title, subtitle, width = 560, footer, children }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(43,37,32,0.40)', zIndex: 60,
        backdropFilter: 'blur(2px)', animation: 'paperFadeIn .18s',
      }}/>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)',
        background: surface(), borderRadius: 14, border: `1px solid ${border()}`,
        boxShadow: '0 2px 4px rgba(43,37,32,.04), 0 24px 48px -16px rgba(43,37,32,.14)',
        zIndex: 61, display: 'flex', flexDirection: 'column',
        animation: 'paperModalIn .22s cubic-bezier(.2,.9,.3,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: `1px solid ${border()}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{
              margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 20,
              color: ink(), letterSpacing: '-0.2px',
            }}>{title}</h2>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: ink(3), fontFamily: FONT_UI }}>
                {subtitle}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Chiudi" style={{
            border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, color: ink(2),
            borderRadius: 6,
          }}>
            <X size={18}/>
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 24px', overflow: 'auto', flex: 1 }}>{children}</div>
        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 24px', borderTop: `1px solid ${border()}`,
            background: surface('muted'), borderRadius: '0 0 14px 14px',
            display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center',
          }}>{footer}</div>
        )}
      </div>
      <style>{`
        @keyframes paperFadeIn { from {opacity:0} to {opacity:1} }
        @keyframes paperModalIn {
          from {opacity:0; transform:translate(-50%,-48%) scale(.98)}
          to   {opacity:1; transform:translate(-50%,-50%) scale(1)}
        }
      `}</style>
    </>
  );
};

// ─── PaperButton ───
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';
export const PaperButton: React.FC<{
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
  title?: string;
}> = ({
  variant = 'secondary', size = 'md', onClick, disabled, children, iconLeft, iconRight,
  type = 'button', style, title,
}) => {
  const styles: Record<ButtonVariant, React.CSSProperties> = {
    primary:   { background: brand('base'), color: '#fff', border: `1px solid ${brand('ink')}` },
    secondary: { background: surface(), color: ink(),     border: `1px solid ${border(true)}` },
    ghost:     { background: 'transparent', color: ink(2), border: '1px solid transparent' },
    danger:    { background: 'hsl(var(--paper-danger))', color: '#fff', border: '1px solid hsl(0 73% 35%)' },
  };
  const sizes: Record<ButtonSize, React.CSSProperties> = {
    sm: { height: 30, padding: '0 10px', fontSize: 12, borderRadius: 7 },
    md: { height: 36, padding: '0 14px', fontSize: 13, borderRadius: 8 },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: FONT_UI, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: 'transform .08s, box-shadow .15s',
        ...sizes[size], ...styles[variant], ...style,
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(0.5px)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = ''; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
};

// ─── Stepper ───
export const PaperStepper: React.FC<{ steps: string[]; current: number }> = ({ steps, current }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
    {steps.map((s, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={s}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
            <span style={{
              width: 26, height: 26, borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: active ? brand('base') : done ? success(true) : surface('muted'),
              color: active ? '#fff' : done ? success() : ink(3),
              border: done && !active ? `1px solid ${success()}` : '1px solid transparent',
              fontSize: 12, fontWeight: 600, fontFamily: FONT_MONO,
            }}>
              {done ? <Check size={13}/> : i + 1}
            </span>
            <span style={{
              fontSize: 13, fontWeight: active ? 500 : 400, fontFamily: FONT_UI,
              color: active ? ink() : done ? ink(2) : ink(3),
            }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 1, background: done ? success() : border(),
              margin: '0 14px', opacity: done ? 0.6 : 1,
            }}/>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Progress bar ───
export const PaperProgress: React.FC<{
  value: number;
  tone?: 'brand' | 'success' | 'warn' | 'gold';
  height?: number;
  showPct?: boolean;
  style?: React.CSSProperties;
}> = ({ value, tone = 'brand', height = 8, showPct = false, style }) => {
  const fill = tone === 'success' ? success() : tone === 'warn' ? warn() : tone === 'gold' ? '#B08A3E' : brand('base');
  const v = Math.min(100, Math.max(0, value));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
      <div style={{
        flex: 1, height, background: surface('muted'), borderRadius: 999, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          width: `${v}%`, height: '100%', background: fill, borderRadius: 999, transition: 'width .3s ease',
        }}/>
      </div>
      {showPct && (
        <span style={{
          fontFamily: FONT_MONO, fontSize: 11, color: ink(3), minWidth: 34, textAlign: 'right',
        }}>{Math.round(v)}%</span>
      )}
    </div>
  );
};

// ─── Avatar (initials) ───
function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
}
const TONES = ['#B08A3E', '#6D3FE0', '#15803D', '#B45309', '#1D4ED8'];
export const PaperAvatar: React.FC<{ name: string; size?: number }> = ({ name, size = 36 }) => {
  const idx = (name.charCodeAt(0) || 0) % TONES.length;
  const bg = TONES[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, background: `${bg}20`,
      color: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT_UI, fontWeight: 600, fontSize: Math.round(size * 0.38), flexShrink: 0,
      border: `1px solid ${bg}40`,
    }}>{getInitials(name) || '·'}</div>
  );
};

// ─── ContactLine ───
export const ContactLine: React.FC<{ icon: React.ReactNode; text: string; href?: string }> = ({ icon, text, href }) => {
  const inner = (
    <>
      <span style={{ color: ink(3), flexShrink: 0, display: 'inline-flex' }}>{icon}</span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
    </>
  );
  const baseStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
    color: ink(2), minWidth: 0, fontFamily: FONT_UI, textDecoration: 'none',
  };
  if (href) {
    return <a href={href} target="_blank" rel="noreferrer" style={baseStyle}>{inner}</a>;
  }
  return <div style={baseStyle}>{inner}</div>;
};

// ─── EmptyState ───
export const PaperEmpty: React.FC<{
  title: string;
  desc?: string;
  cta?: React.ReactNode;
}> = ({ title, desc, cta }) => (
  <div style={{
    padding: '32px 20px', textAlign: 'center', background: surface('muted'),
    border: `1px dashed ${border(true)}`, borderRadius: 12,
  }}>
    <div style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 500, color: ink(), marginBottom: 6 }}>
      {title}
    </div>
    {desc && (
      <div style={{ fontSize: 13, color: ink(2), marginBottom: cta ? 14 : 0, maxWidth: 380, margin: '0 auto 14px', fontFamily: FONT_UI }}>
        {desc}
      </div>
    )}
    {cta}
  </div>
);

// ─── SectionHeader ───
export const PaperSectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, gap: 12 }}>
    <h2 style={{ margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 22, color: ink(), letterSpacing: '-0.2px' }}>
      {title}
    </h2>
    {action}
  </div>
);

// ─── Form primitives ───
export const PaperLabel: React.FC<{
  children: React.ReactNode; required?: boolean; hint?: string;
}> = ({ children, required, hint }) => (
  <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: ink(2), fontFamily: FONT_UI }}>
      {children} {required && <span style={{ color: 'hsl(var(--paper-danger))' }}>*</span>}
    </label>
    {hint && <span style={{ fontSize: 11, color: ink(3), fontFamily: FONT_UI }}>· {hint}</span>}
  </div>
);

export const PaperInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { iconLeft?: React.ReactNode }>(
  ({ iconLeft, style, ...props }, ref) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {iconLeft && (
        <span style={{
          position: 'absolute', left: 10, color: ink(3),
          display: 'inline-flex', pointerEvents: 'none',
        }}>{iconLeft}</span>
      )}
      <input
        ref={ref}
        {...props}
        style={{
          width: '100%', height: 38, padding: iconLeft ? '0 12px 0 32px' : '0 12px',
          fontSize: 13, color: ink(), background: surface(),
          border: `1px solid ${border(true)}`, borderRadius: 8, fontFamily: FONT_UI,
          outline: 'none',
          ...style,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = brand('base'); e.currentTarget.style.boxShadow = `0 0 0 3px ${brand('tint')}`; props.onFocus?.(e); }}
        onBlur={e => { e.currentTarget.style.borderColor = border(true); e.currentTarget.style.boxShadow = 'none'; props.onBlur?.(e); }}
      />
    </div>
  ),
);
PaperInput.displayName = 'PaperInput';

export const PaperTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    style={{
      width: '100%', minHeight: 80, padding: '10px 12px',
      fontSize: 13, color: ink(), background: surface(),
      border: `1px solid ${border(true)}`, borderRadius: 8, fontFamily: FONT_UI,
      outline: 'none', resize: 'vertical',
      ...(props.style || {}),
    }}
  />
);

export const PaperSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
}> = ({ value, onChange, options, style }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      height: 38, padding: '0 12px', fontSize: 13,
      background: surface(), color: ink(),
      border: `1px solid ${border(true)}`, borderRadius: 8,
      fontFamily: FONT_UI, cursor: 'pointer', outline: 'none',
      ...style,
    }}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export const PaperDivider: React.FC<{ label?: string }> = ({ label }) => {
  if (!label) return <div style={{ height: 1, background: border(), margin: '8px 0' }}/>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: border() }}/>
      <span style={{
        fontSize: 11, fontFamily: FONT_UI, color: ink(3), letterSpacing: '0.1em',
        textTransform: 'uppercase', fontWeight: 600,
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: border() }}/>
    </div>
  );
};

// Chevron exports for convenience
export { ChevronLeft, ChevronRight };
