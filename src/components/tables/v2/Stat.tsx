interface Props {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "danger" | "warn";
}

export const Stat = ({ label, value, tone = "neutral" }: Props) => {
  const colorMap: Record<string, string> = {
    neutral: "hsl(var(--foreground))",
    success: "hsl(var(--status-confirmed))",
    danger: "hsl(var(--destructive))",
    warn: "hsl(var(--status-urgent))",
  };
  return (
    <div className="whitespace-nowrap">
      <div
        className="text-[11px] uppercase"
        style={{ letterSpacing: "0.12em", color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </div>
      <div
        className="font-medium leading-tight mt-0.5"
        style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: colorMap[tone] }}
      >
        {value}
      </div>
    </div>
  );
};
