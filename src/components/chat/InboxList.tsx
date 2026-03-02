import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface InboxItem {
  weddingId: string;
  coupleNames: string;
  weddingDate: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface InboxListProps {
  items: InboxItem[];
  selectedWeddingId: string | null;
  onSelect: (weddingId: string) => void;
}

export function InboxList({ items, selectedWeddingId, onSelect }: InboxListProps) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        Nessuna conversazione attiva
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <button
          key={item.weddingId}
          onClick={() => onSelect(item.weddingId)}
          className={cn(
            "w-full text-left p-3 hover:bg-accent/5 transition-colors flex items-start gap-3",
            selectedWeddingId === item.weddingId && "bg-accent/10"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold text-sm shrink-0">
            {item.coupleNames.split(" & ").map(n => n[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{item.coupleNames}</span>
              {item.lastMessageAt && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: true, locale: it })}
                </span>
              )}
            </div>
            {item.lastMessage && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.lastMessage}</p>
            )}
          </div>
          {item.unreadCount > 0 && (
            <Badge className="shrink-0 bg-primary text-primary-foreground text-[10px] px-1.5 min-w-[20px] flex items-center justify-center">
              {item.unreadCount}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
