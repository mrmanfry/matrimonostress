import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
};

type Table = {
  id: string;
  name: string;
};

type Assignment = {
  id: string;
  table_id: string;
  guest_id: string;
};

interface Props {
  guests: Guest[];
  tables: Table[];
  assignments: Assignment[];
  onSelectTable: (tableId: string) => void;
}

export const SeatedGuestSearch = ({ guests, tables, assignments, onSelectTable }: Props) => {
  const [q, setQ] = useState("");

  const tableById = useMemo(() => new Map(tables.map((t) => [t.id, t])), [tables]);
  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return assignments
      .map((a) => {
        const g = guestById.get(a.guest_id);
        const t = tableById.get(a.table_id);
        if (!g || !t) return null;
        const full = `${g.first_name} ${g.last_name}`;
        if (!full.toLowerCase().includes(term)) return null;
        return { guest: g, table: t, fullName: full };
      })
      .filter((x): x is { guest: Guest; table: Table; fullName: string } => x !== null)
      .slice(0, 20);
  }, [q, assignments, guestById, tableById]);

  return (
    <div className="mb-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca un ospite seduto…"
          className="h-9 pl-8 text-sm"
        />
      </div>
      {q.trim() && (
        <div className="mt-2 rounded-md border bg-card divide-y max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-3">
              Nessun ospite seduto trovato.
            </div>
          ) : (
            results.map(({ guest, table }) => (
              <Button
                key={guest.id}
                variant="ghost"
                className="w-full justify-between h-auto py-2 px-3 rounded-none"
                onClick={() => {
                  onSelectTable(table.id);
                  setQ("");
                }}
              >
                <span className="text-sm truncate">{guest.first_name} {guest.last_name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <MapPin className="w-3 h-3" />
                  {table.name}
                </span>
              </Button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
