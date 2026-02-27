import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, XCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

export function TrialBadge() {
  const { status, daysLeft, isReadOnly } = useSubscription();
  const navigate = useNavigate();

  // Hidden if active or still loading
  if (status === "active" || status === "loading") return null;

  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let icon = <Clock className="w-3.5 h-3.5" />;
  let label = "";
  let badgeClass = "";

  if (status === "trialing" && daysLeft !== null) {
    if (daysLeft > 5) {
      label = `Trial: ${daysLeft} giorni`;
      badgeClass = "bg-muted/50 text-foreground hover:bg-muted/70 border-border";
    } else if (daysLeft > 0) {
      label = `Trial: ${daysLeft} giorni`;
      icon = <AlertTriangle className="w-3.5 h-3.5" />;
      badgeClass = "bg-status-urgent/15 text-status-urgent border-status-urgent/30 hover:bg-status-urgent/25";
    } else {
      label = "Trial Terminato";
      icon = <XCircle className="w-3.5 h-3.5" />;
      badgeClass = "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25";
    }
  } else if (status === "canceled" || status === "past_due") {
    label = status === "past_due" ? "Pagamento scaduto" : "Trial Terminato";
    icon = <XCircle className="w-3.5 h-3.5" />;
    badgeClass = "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25";
  }

  if (!label) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer gap-1.5 px-3 py-1 text-xs font-medium transition-colors",
        badgeClass
      )}
      onClick={() => navigate("/app/upgrade")}
    >
      {icon}
      {label}
    </Badge>
  );
}
