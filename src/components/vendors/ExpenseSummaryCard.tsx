import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ExpenseSummaryCardProps {
  totalPlanned: number;
  totalActual: number;
}

export function ExpenseSummaryCard({ totalPlanned, totalActual }: ExpenseSummaryCardProps) {
  const savings = totalPlanned - totalActual;

  return (
    <Card className="bg-primary/5 border-primary">
      <CardHeader>
        <CardTitle>Riepilogo Foglio di Calcolo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-lg">
          <span>Totale Pianificato (Preventivo):</span>
          <span className="font-bold">€ {totalPlanned.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg">
          <span>Totale Effettivo (Da RSVP):</span>
          <span className="font-bold text-primary">€ {totalActual.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-xl">
          <span>Risparmio (vs. Piano):</span>
          <span className={`font-bold ${savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            € {Math.abs(savings).toFixed(2)}
            {savings >= 0 ? ' 🎉' : ' ⚠️'}
          </span>
        </div>
        {savings < 0 && (
          <p className="text-sm text-destructive">
            ⚠️ Attenzione: il costo effettivo supera il preventivo pianificato
          </p>
        )}
      </CardContent>
    </Card>
  );
}
