/** Editorial section divider with small uppercase label. */
export function DetailDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3 first:mt-0">
      <div className="text-[10px] tracking-[0.18em] uppercase text-paper-ink-3 font-medium">
        {label}
      </div>
      <div className="flex-1 h-px bg-paper-border" />
    </div>
  );
}
