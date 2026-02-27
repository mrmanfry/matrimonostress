import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { WEDDING_COLORS } from "./WeddingCard";

export interface FeedItem {
  id: string;
  type: "task" | "payment";
  title: string;
  dueDate: string;
  weddingLabel: string;
  weddingColorIndex: number;
  weddingId: string;
  amount?: number;
}

interface CrossWeddingFeedProps {
  items: FeedItem[];
  onNavigate: (weddingId: string, type: "task" | "payment") => void;
}

export function CrossWeddingFeed({ items, onNavigate }: CrossWeddingFeedProps) {
  if (items.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Nessuna scadenza nei prossimi 30 giorni 🎉
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border">
      <div className="p-4 pb-2">
        <h3 className="font-serif font-semibold text-sm">Prossime Scadenze</h3>
      </div>
      {items.slice(0, 15).map((item) => {
        const Icon = item.type === "task" ? CheckSquare : CreditCard;
        const color = WEDDING_COLORS[item.weddingColorIndex % WEDDING_COLORS.length];
        const dateObj = new Date(item.dueDate);
        const now = new Date();
        const isOverdue = dateObj < now;

        return (
          <button
            key={`${item.type}-${item.id}`}
            onClick={() => onNavigate(item.weddingId, item.type)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
          >
            <Icon className={`w-4 h-4 shrink-0 ${isOverdue ? "text-[hsl(var(--status-overdue))]" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{item.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-muted-foreground truncate">{item.weddingLabel}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xs font-medium ${isOverdue ? "text-[hsl(var(--status-overdue))]" : ""}`}>
                {format(dateObj, "d MMM", { locale: it })}
              </p>
              {item.amount !== undefined && (
                <p className="text-[10px] text-muted-foreground">€{item.amount.toLocaleString("it-IT")}</p>
              )}
            </div>
          </button>
        );
      })}
    </Card>
  );
}
