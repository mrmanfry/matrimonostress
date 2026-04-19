interface Props {
  step: string;
  title: string;
  description?: string;
}

/**
 * Eyebrow + serif title + supporting description used at the top of every
 * editor step. Matches the Libretto Messa design — no shadcn dependency.
 */
export default function BookletStepHeader({ step, title, description }: Props) {
  return (
    <div className="mb-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--paper-ink-3))]">
        {step}
      </div>
      <h2 className="font-fraunces text-[26px] font-normal text-[hsl(var(--paper-ink))] mt-1 leading-tight tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-[hsl(var(--paper-ink-2))] mt-2 max-w-[620px] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
