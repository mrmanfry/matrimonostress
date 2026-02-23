import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

interface ExpenseSummaryCardProps {
  totalPlanned: number;
  totalActual: number;
}

export function ExpenseSummaryCard({ totalPlanned, totalActual }: ExpenseSummaryCardProps) {
  const savings = totalPlanned - totalActual;
  const isMobile = useIsMobile();

  return (
    <Card className="bg-primary/5 border-primary">
      <CardHeader className="px-4 md:px-6 py-3 md:py-4">
        <CardTitle className="text-base md:text-lg">Riepilogo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-3 px-4 md:px-6">
        <div className="flex justify-between text-sm md:text-lg">
          <span>{isMobile ? 'Pianificato:' : 'Totale Pianificato (Preventivo):'}</span>
          <span className="font-bold">€ {totalPlanned.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm md:text-lg">
          <span>{isMobile ? 'Effettivo:' : 'Totale Effettivo (Da RSVP):'}</span>
          <span className="font-bold text-primary">€ {totalActual.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-base md:text-xl">
          <span>{isMobile ? 'Risparmio:' : 'Risparmio (vs. Piano):'}</span>
          <span className={`font-bold ${savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            € {Math.abs(savings).toFixed(2)}
            {savings >= 0 ? ' 🎉' : ' ⚠️'}
          </span>
        </div>
        {savings < 0 && (
          <p className="text-xs md:text-sm text-destructive">
            ⚠️ {isMobile ? 'Costo effettivo > preventivo' : 'Attenzione: il costo effettivo supera il preventivo pianificato'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
