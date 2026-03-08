import { Card, CardContent } from "@/components/ui/card";
import { Users, Leaf, Wheat, AlertTriangle, Baby, HelpCircle } from "lucide-react";

interface CateringGuest {
  id: string;
  first_name: string;
  last_name: string;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  is_child: boolean;
  rsvp_status: string | null;
  table_name?: string;
}

interface CateringKPIsProps {
  guests: CateringGuest[];
}

export const CateringKPIs = ({ guests }: CateringKPIsProps) => {
  const confirmed = guests.filter(g => g.rsvp_status === "confirmed");
  const totalConfirmed = confirmed.length;
  const adults = confirmed.filter(g => !g.is_child).length;
  const children = confirmed.filter(g => g.is_child).length;
  const vegetarians = confirmed.filter(g => g.menu_choice === "vegetariano").length;
  const vegans = confirmed.filter(g => g.menu_choice === "vegano").length;
  const celiacs = confirmed.filter(g => g.menu_choice === "celiaco").length;
  const withAllergies = confirmed.filter(g => g.dietary_restrictions?.trim()).length;
  const noPreference = confirmed.filter(g => !g.menu_choice && !g.dietary_restrictions?.trim()).length;

  const kpis = [
    { label: "Confermati", value: totalConfirmed, sub: `${adults} adulti · ${children} bambini`, icon: Users, color: "text-primary" },
    { label: "Vegetariani", value: vegetarians, icon: Leaf, color: "text-green-600" },
    { label: "Vegani", value: vegans, icon: Leaf, color: "text-emerald-700" },
    { label: "Celiaci", value: celiacs, icon: Wheat, color: "text-amber-600" },
    { label: "Con Allergie", value: withAllergies, icon: AlertTriangle, color: "text-destructive" },
    { label: "Senza Preferenza", value: noPreference, icon: HelpCircle, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="bg-card">
            <CardContent className="p-4 text-center space-y-1">
              <Icon className={`w-5 h-5 mx-auto ${kpi.color}`} />
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              {"sub" in kpi && kpi.sub && (
                <div className="text-[10px] text-muted-foreground">{kpi.sub}</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
