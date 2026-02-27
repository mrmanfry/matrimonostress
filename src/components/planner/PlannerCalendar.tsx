import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { WeddingContext } from "@/contexts/AuthContext";
import { WEDDING_COLORS } from "./WeddingCard";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PlannerCalendarProps {
  weddings: WeddingContext[];
  month: Date;
  onMonthChange: (month: Date) => void;
}

export function PlannerCalendar({ weddings, month, onMonthChange }: PlannerCalendarProps) {
  const weddingDates = useMemo(() => {
    const map = new Map<string, { color: string; names: string }>();
    weddings.forEach((w, i) => {
      const key = w.weddingDate; // yyyy-mm-dd
      map.set(key, {
        color: WEDDING_COLORS[i % WEDDING_COLORS.length],
        names: `${w.partner1Name} & ${w.partner2Name}`,
      });
    });
    return map;
  }, [weddings]);

  // Highlight wedding dates
  const weddingDayDates = useMemo(
    () => weddings.map((w) => new Date(w.weddingDate)),
    [weddings]
  );

  return (
    <Card className="p-4">
      <h3 className="font-serif font-semibold text-sm mb-3">Calendario Matrimoni</h3>
      <Calendar
        mode="multiple"
        selected={weddingDayDates}
        month={month}
        onMonthChange={onMonthChange}
        className="p-0 pointer-events-auto"
        modifiersStyles={{
          selected: {
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            fontWeight: 700,
          },
        }}
      />
      {weddings.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {weddings.map((w, i) => (
            <div key={w.weddingId} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: WEDDING_COLORS[i % WEDDING_COLORS.length] }}
              />
              <span className="truncate max-w-[120px]">
                {w.partner1Name} & {w.partner2Name} — {format(new Date(w.weddingDate), "d MMM", { locale: it })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
