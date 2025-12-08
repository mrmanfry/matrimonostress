import { Badge } from "@/components/ui/badge";

interface PriorityBadgeProps {
  priority: string | undefined;
  size?: "sm" | "default";
}

export function PriorityBadge({ priority, size = "default" }: PriorityBadgeProps) {
  const config = {
    high: {
      label: "Alta",
      emoji: "🔴",
      className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    },
    medium: {
      label: "Media",
      emoji: "🟡",
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    },
    low: {
      label: "Bassa",
      emoji: "🟢",
      className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    },
  };

  const p = priority || "medium";
  const { label, emoji, className } = config[p as keyof typeof config] || config.medium;

  return (
    <Badge 
      variant="outline" 
      className={`${className} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      <span className="mr-1">{emoji}</span>
      {label}
    </Badge>
  );
}
