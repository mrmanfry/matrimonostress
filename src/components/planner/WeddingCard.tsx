import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WeddingContext } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowRight, Users, CheckSquare, CreditCard } from "lucide-react";

const WEDDING_COLORS = [
  "hsl(250 80% 65%)",
  "hsl(340 75% 55%)",
  "hsl(170 65% 45%)",
  "hsl(30 85% 55%)",
  "hsl(200 80% 50%)",
  "hsl(280 60% 55%)",
];

export interface WeddingCardData {
  wedding: WeddingContext;
  guestCount: number;
  confirmedGuests: number;
  totalTasks: number;
  completedTasks: number;
  pendingPayments: number;
}

interface WeddingCardProps {
  data: WeddingCardData;
  colorIndex: number;
  onOpen: (weddingId: string) => void;
}

export function WeddingCard({ data, colorIndex, onOpen }: WeddingCardProps) {
  const { wedding, guestCount, confirmedGuests, totalTasks, completedTasks, pendingPayments } = data;
  const weddingDate = new Date(wedding.weddingDate);
  const now = new Date();
  const daysUntil = Math.ceil((weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isPast = daysUntil < 0;
  const isUrgent = daysUntil >= 0 && daysUntil <= 30;
  const color = WEDDING_COLORS[colorIndex % WEDDING_COLORS.length];

  return (
    <Card className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            <h3 className="font-serif font-semibold text-sm truncate">
              {wedding.partner1Name} & {wedding.partner2Name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {format(weddingDate, "d MMMM yyyy", { locale: it })}
            </p>
          </div>
        </div>
        <Badge variant={isPast ? "secondary" : isUrgent ? "destructive" : "outline"} className="shrink-0 text-[10px]">
          {isPast ? "Passato" : `${daysUntil}g`}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/20 rounded-lg p-2">
          <Users className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className="text-sm font-semibold">{confirmedGuests}/{guestCount}</p>
          <p className="text-[9px] text-muted-foreground">Confermati</p>
        </div>
        <div className="bg-muted/20 rounded-lg p-2">
          <CheckSquare className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className="text-sm font-semibold">{completedTasks}/{totalTasks}</p>
          <p className="text-[9px] text-muted-foreground">Task</p>
        </div>
        <div className="bg-muted/20 rounded-lg p-2">
          <CreditCard className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className="text-sm font-semibold">{pendingPayments}</p>
          <p className="text-[9px] text-muted-foreground">Pagamenti</p>
        </div>
      </div>

      <Button
        size="sm"
        className="w-full mt-auto"
        onClick={() => onOpen(wedding.weddingId)}
      >
        Apri progetto <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </Card>
  );
}

export { WEDDING_COLORS };
