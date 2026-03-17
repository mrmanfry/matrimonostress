import { Hotel, Users, BedDouble, Euro } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AccommodationKPIsProps {
  totalRooms: number;
  assignedGuests: number;
  totalGuests: number;
  totalCost: number;
}

export const AccommodationKPIs = ({ totalRooms, assignedGuests, totalGuests, totalCost }: AccommodationKPIsProps) => {
  const unassigned = Math.max(0, totalGuests - assignedGuests);

  const kpis = [
    { label: "Camere totali", value: totalRooms, icon: BedDouble, color: "text-primary" },
    { label: "Ospiti assegnati", value: assignedGuests, icon: Users, color: "text-emerald-600" },
    { label: "Senza alloggio", value: unassigned, icon: Hotel, color: unassigned > 0 ? "text-amber-600" : "text-muted-foreground" },
    { label: "Costo stimato", value: `€ ${totalCost.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`, icon: Euro, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
