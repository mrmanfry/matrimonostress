import { Badge } from "@/components/ui/badge";

interface PriorityBadgeProps {
  priority: string | undefined;
  size?: "sm" | "default";
}

export function PriorityBadge({ priority, size = "default" }: PriorityBadgeProps) {
  const config = {
    high: {
      label: "Alta",
      className: "bg-muted text-destructive border-transparent",
    },
    medium: {
      label: "Media",
      className: "bg-muted text-muted-foreground border-transparent",
    },
    low: {
      label: "Bassa",
      className: "bg-muted text-muted-foreground border-transparent",
    },
  };

  const p = priority || "medium";
  const { label, className } = config[p as keyof typeof config] || config.medium;

  return (
    <Badge 
      variant="outline" 
      className={`${className} font-normal ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      {label}
    </Badge>
  );
}