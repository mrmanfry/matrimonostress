import { cn } from "@/lib/utils";

interface GroupDotProps {
  groupName: string;
  size?: "sm" | "md";
  className?: string;
  showLabel?: boolean;
}

// Desaturated 8-color categorical palette (per Design System v1.0)
const GROUP_COLORS = [
  "bg-indigo-400/80",
  "bg-rose-400/80",
  "bg-teal-400/80",
  "bg-amber-400/80",
  "bg-cyan-400/80",
  "bg-orange-400/80",
  "bg-lime-500/80",
  "bg-slate-400/80",
];

/** Deterministic hash → 0..7 */
function hashGroupName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % GROUP_COLORS.length;
}

const SIZE_MAP = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
};

export function GroupDot({
  groupName,
  size = "sm",
  className,
  showLabel = true,
}: GroupDotProps) {
  const colorClass = GROUP_COLORS[hashGroupName(groupName)];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
      title={`Gruppo: ${groupName}`}
    >
      <span
        className={cn("inline-block rounded-full flex-shrink-0", SIZE_MAP[size], colorClass)}
        aria-hidden
      />
      {showLabel && <span className="truncate">{groupName}</span>}
    </span>
  );
}
