import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Leaf, Wheat, Baby } from "lucide-react";
import { type CateringGuestRow, getCateringTypeLabel } from "./CateringGuestTable";

interface CateringByTableProps {
  guests: CateringGuestRow[];
}

export const CateringByTable = ({ guests }: CateringByTableProps) => {
  const confirmed = guests.filter(g => g.rsvp_status === "confirmed");

  // Group by table
  const grouped = new Map<string, CateringGuestRow[]>();
  confirmed.forEach(g => {
    const key = g.table_name || "Non assegnati";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  });

  // Sort: named tables first, unassigned last
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    if (a === "Non assegnati") return 1;
    if (b === "Non assegnati") return -1;
    return a.localeCompare(b);
  });

  const countDiet = (list: CateringGuestRow[], choice: string) =>
    list.filter(g => g.menu_choice === choice).length;

  return (
    <div className="space-y-4">
      {sortedKeys.map(tableName => {
        const tableGuests = grouped.get(tableName)!;
        const veg = countDiet(tableGuests, "vegetariano");
        const vgn = countDiet(tableGuests, "vegano");
        const cel = countDiet(tableGuests, "celiaco");
        const allerg = tableGuests.filter(g => g.dietary_restrictions?.trim()).length;
        const adults = tableGuests.filter(g => !g.is_child).length;
        const kids = tableGuests.filter(g => g.is_child && g.child_age_group !== "infant").length;
        const infants = tableGuests.filter(g => g.is_child && g.child_age_group === "infant").length;

        return (
          <Card key={tableName}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{tableName}</CardTitle>
                <Badge variant="outline">{tableGuests.length} ospiti</Badge>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {adults} adulti{kids > 0 ? ` · ${kids} bimbi` : ""}{infants > 0 ? ` · ${infants} <3 anni` : ""}
                </Badge>
                {veg > 0 && <Badge variant="secondary" className="text-xs gap-1"><Leaf className="w-3 h-3" />{veg} veg</Badge>}
                {vgn > 0 && <Badge variant="secondary" className="text-xs gap-1"><Leaf className="w-3 h-3" />{vgn} vegano</Badge>}
                {cel > 0 && <Badge variant="secondary" className="text-xs gap-1"><Wheat className="w-3 h-3" />{cel} celiaco</Badge>}
                {allerg > 0 && <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="w-3 h-3" />{allerg} allergie</Badge>}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y divide-border">
                {tableGuests.map(g => {
                  const type = getCateringTypeLabel(g);
                  return (
                    <li key={g.id} className="py-2 flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        {g.first_name} {g.last_name}
                        {type.key !== "adult" && (
                          <Badge
                            variant={type.key === "infant" ? "secondary" : "outline"}
                            className="text-[10px] gap-1 px-1.5 py-0"
                          >
                            <Baby className="w-3 h-3" /> {type.label}
                          </Badge>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {g.menu_choice && (
                          <Badge variant="outline" className="text-xs">{g.menu_choice}</Badge>
                        )}
                        {g.dietary_restrictions?.trim() && (
                          <span className="text-xs text-destructive">{g.dietary_restrictions}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
      {sortedKeys.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nessun ospite confermato</p>
      )}
    </div>
  );
};
