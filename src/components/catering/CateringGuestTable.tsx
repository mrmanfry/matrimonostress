import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, Baby } from "lucide-react";

export interface CateringGuestRow {
  id: string;
  first_name: string;
  last_name: string;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  is_child: boolean;
  rsvp_status: string | null;
  table_name: string | null;
  party_name: string | null;
  notes: string | null;
}

interface CateringGuestTableProps {
  guests: CateringGuestRow[];
  tables: string[];
}

const dietLabel = (choice: string | null): string => {
  if (!choice) return "-";
  const map: Record<string, string> = {
    vegetariano: "Vegetariano",
    vegano: "Vegano",
    celiaco: "Celiaco",
  };
  return map[choice] || choice;
};

export const CateringGuestTable = ({ guests, tables }: CateringGuestTableProps) => {
  const [search, setSearch] = useState("");
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterDiet, setFilterDiet] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = guests.filter(g => g.rsvp_status === "confirmed");

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(g =>
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
      );
    }

    if (filterTable !== "all") {
      if (filterTable === "unassigned") {
        result = result.filter(g => !g.table_name);
      } else {
        result = result.filter(g => g.table_name === filterTable);
      }
    }

    if (filterDiet !== "all") {
      if (filterDiet === "allergie") {
        result = result.filter(g => g.dietary_restrictions?.trim());
      } else if (filterDiet === "nessuna") {
        result = result.filter(g => !g.menu_choice && !g.dietary_restrictions?.trim());
      } else {
        result = result.filter(g => g.menu_choice === filterDiet);
      }
    }

    return result;
  }, [guests, search, filterTable, filterDiet]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca ospite..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tutti i tavoli" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tavoli</SelectItem>
            <SelectItem value="unassigned">Non assegnati</SelectItem>
            {tables.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDiet} onValueChange={setFilterDiet}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tutte le diete" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le diete</SelectItem>
            <SelectItem value="vegetariano">Vegetariano</SelectItem>
            <SelectItem value="vegano">Vegano</SelectItem>
            <SelectItem value="celiaco">Celiaco</SelectItem>
            <SelectItem value="allergie">Con Allergie</SelectItem>
            <SelectItem value="nessuna">Senza Preferenza</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Result count */}
      <p className="text-sm text-muted-foreground">{filtered.length} ospiti confermati</p>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Nucleo</TableHead>
              <TableHead>Tavolo</TableHead>
              <TableHead>Dieta</TableHead>
              <TableHead>Allergie</TableHead>
              <TableHead className="hidden lg:table-cell">Note</TableHead>
              <TableHead className="w-[60px]">Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nessun ospite confermato trovato
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    {g.first_name} {g.last_name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {g.party_name || "-"}
                  </TableCell>
                  <TableCell>
                    {g.table_name ? (
                      <Badge variant="outline">{g.table_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {g.menu_choice ? (
                      <Badge variant="secondary" className="text-xs">{dietLabel(g.menu_choice)}</Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {g.dietary_restrictions?.trim() ? (
                      <span className="text-xs flex items-center gap-1 text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        {g.dietary_restrictions}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[150px] truncate">
                    {g.notes || "-"}
                  </TableCell>
                  <TableCell>
                    {g.is_child ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Baby className="w-3 h-3" /> Bimbo
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Adulto</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
