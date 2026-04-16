import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CateringGuestRow } from "@/components/catering/CateringGuestTable";

interface DietaryRestrictionsTabProps {
  guests: CateringGuestRow[];
}

/**
 * Restrizioni — sostituisce la vecchia tab "Menu" di Analytics Invitati.
 * Mostra count per dieta + lista invitati con restrizioni dietetiche.
 */
export const DietaryRestrictionsTab = ({ guests }: DietaryRestrictionsTabProps) => {
  const stats = useMemo(() => {
    const confirmed = guests.filter((g) => g.rsvp_status === "confirmed");

    const matches = (g: CateringGuestRow, keywords: string[]) => {
      const haystack = `${g.menu_choice || ""} ${g.dietary_restrictions || ""}`.toLowerCase();
      return keywords.some((k) => haystack.includes(k));
    };

    const vegetariani = confirmed.filter((g) => matches(g, ["vegetarian", "vegetariano"])).length;
    const vegani = confirmed.filter((g) => matches(g, ["vegan"])).length;
    const celiaci = confirmed.filter((g) =>
      matches(g, ["celiac", "glutine", "gluten"])
    ).length;
    const altre = confirmed.filter(
      (g) =>
        g.dietary_restrictions &&
        g.dietary_restrictions.trim() !== "" &&
        !matches(g, ["vegetarian", "vegetariano", "vegan", "celiac", "glutine", "gluten"])
    ).length;

    const conRestrizioni = confirmed.filter(
      (g) =>
        (g.dietary_restrictions && g.dietary_restrictions.trim() !== "") ||
        (g.menu_choice && g.menu_choice.toLowerCase() !== "standard")
    );

    return { vegetariani, vegani, celiaci, altre, conRestrizioni, totalConfirmed: confirmed.length };
  }, [guests]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Vegetariani" value={stats.vegetariani} />
        <StatCard label="Vegani" value={stats.vegani} />
        <StatCard label="Senza glutine" value={stats.celiaci} />
        <StatCard label="Altre restrizioni" value={stats.altre} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Invitati con restrizioni o scelte particolari
            <span className="text-muted-foreground font-normal ml-2">
              ({stats.conRestrizioni.length} su {stats.totalConfirmed} confermati)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.conRestrizioni.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun invitato confermato ha indicato restrizioni dietetiche.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.conRestrizioni.map((g) => (
                <li
                  key={g.id}
                  className="py-2.5 flex items-start justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {g.first_name} {g.last_name}
                      {g.is_child && (
                        <span className="ml-2 text-xs text-muted-foreground">(bambino)</span>
                      )}
                    </div>
                    {g.party_name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {g.party_name}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                    {g.menu_choice && (
                      <Badge variant="secondary" className="font-normal">
                        {g.menu_choice}
                      </Badge>
                    )}
                    {g.dietary_restrictions && g.dietary_restrictions.trim() !== "" && (
                      <Badge variant="outline" className="font-normal">
                        {g.dietary_restrictions}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-border bg-card px-4 py-3">
    <div className="text-2xl font-semibold tabular-nums text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
  </div>
);

export default DietaryRestrictionsTab;
