import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface LockedInlineProps {
  variant: "inline";
  label?: string;
}

interface LockedFullPageProps {
  variant: "full-page";
  title: string;
  subtitle?: string;
  message?: string;
}

type LockedCardProps = LockedInlineProps | LockedFullPageProps;

export function LockedCard(props: LockedCardProps) {
  if (props.variant === "inline") {
    return (
      <Badge variant="secondary" className="gap-1 text-muted-foreground font-normal">
        <Lock className="w-3 h-3" />
        {props.label || "Riservato"}
      </Badge>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="p-8 md:p-12 max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-muted">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-xl font-bold">{props.title}</h2>
        {props.subtitle && (
          <p className="text-muted-foreground">{props.subtitle}</p>
        )}
        {props.message && (
          <p className="text-sm text-muted-foreground/80">{props.message}</p>
        )}
      </Card>
    </div>
  );
}
