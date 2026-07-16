import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Leaf, Wheat, AlertTriangle, HelpCircle, UtensilsCrossed } from "lucide-react";

interface CateringGuest {
  id: string;
  first_name: string;
  last_name: string;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  is_child: boolean;
  child_age_group?: string | null;
  rsvp_status: string | null;
  table_name?: string | null;
}

interface CateringKPIsProps {
  guests: CateringGuest[];
  staffMeals?: number;
}

type KPIKey = "confirmed" | "vegetarians" | "vegans" | "celiacs" | "allergies" | "noPref" | "staff";

export const CateringKPIs = ({ guests, staffMeals = 0 }: CateringKPIsProps) => {
  const [openKey, setOpenKey] = useState<KPIKey | null>(null);

  const confirmed = guests.filter(g => g.rsvp_status === "confirmed");
  const totalConfirmed = confirmed.length;
  const adults = confirmed.filter(g => !g.is_child).length;
  const kids = confirmed.filter(g => g.is_child && g.child_age_group !== "infant").length;
  const infants = confirmed.filter(g => g.is_child && g.child_age_group === "infant").length;
  const vegetarians = confirmed.filter(g => g.menu_choice === "vegetariano");
  const vegans = confirmed.filter(g => g.menu_choice === "vegano");
  const celiacs = confirmed.filter(g => g.menu_choice === "celiaco");
  const withAllergies = confirmed.filter(g => g.dietary_restrictions?.trim());
  const noPreference = confirmed.filter(g => !g.menu_choice && !g.dietary_restrictions?.trim());

  const kpis: Array<{
    key: KPIKey;
    label: string;
    value: number;
    sub?: string;
    icon: typeof Users;
    color: string;
    list?: CateringGuest[];
    clickable: boolean;
  }> = [
    { key: "confirmed", label: "Confermati", value: totalConfirmed, sub: `${adults} adulti · ${kids} bambini · ${infants} <3 anni`, icon: Users, color: "text-primary", list: confirmed, clickable: true },
    { key: "vegetarians", label: "Vegetariani", value: vegetarians.length, icon: Leaf, color: "text-green-600", list: vegetarians, clickable: true },
    { key: "vegans", label: "Vegani", value: vegans.length, icon: Leaf, color: "text-emerald-700", list: vegans, clickable: true },
    { key: "celiacs", label: "Celiaci", value: celiacs.length, icon: Wheat, color: "text-amber-600", list: celiacs, clickable: true },
    { key: "allergies", label: "Con Allergie", value: withAllergies.length, icon: AlertTriangle, color: "text-destructive", list: withAllergies, clickable: true },
    { key: "noPref", label: "Senza Preferenza", value: noPreference.length, icon: HelpCircle, color: "text-muted-foreground", list: noPreference, clickable: true },
    { key: "staff", label: "Pasti Staff", value: staffMeals, sub: "Da fornitori (fotografo, musicisti, ecc.)", icon: UtensilsCrossed, color: "text-blue-600", clickable: false },
  ];

  const activeKpi = kpis.find(k => k.key === openKey);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.key}
              className={`bg-card ${kpi.clickable ? "cursor-pointer hover:border-primary transition-colors" : ""}`}
              onClick={() => kpi.clickable && setOpenKey(kpi.key)}
              role={kpi.clickable ? "button" : undefined}
              tabIndex={kpi.clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (kpi.clickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setOpenKey(kpi.key);
                }
              }}
            >
              <CardContent className="p-4 text-center space-y-1">
                <Icon className={`w-5 h-5 mx-auto ${kpi.color}`} />
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
                {kpi.sub && <div className="text-[10px] text-muted-foreground">{kpi.sub}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!openKey} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeKpi?.label} · {activeKpi?.value}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {activeKpi?.list && activeKpi.list.length > 0 ? (
              <ul className="divide-y divide-border">
                {activeKpi.list.map(g => (
                  <li key={g.id} className="py-2 flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {g.first_name} {g.last_name}
                      {g.is_child && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {g.child_age_group === "infant" ? "<3 anni" : "Bambino"}
                        </Badge>
                      )}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {g.table_name && <span>{g.table_name}</span>}
                      {g.dietary_restrictions?.trim() && (
                        <span className="text-destructive">{g.dietary_restrictions}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">Nessun ospite in questa categoria</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
