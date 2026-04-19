import { useMemo, useState } from "react";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { GuestPoolSidebar } from "./GuestPoolSidebar";
import { TableCardV2 } from "./TableCardV2";
import { TableDetailPanel } from "./TableDetailPanel";
import { TablesListView } from "./TablesListView";
import { Button } from "@/components/ui/button";
import type { GuestV2, TableV2, AssignmentV2, GuestGroupV2 } from "./types";

interface Props {
  tables: TableV2[];
  guests: GuestV2[];
  assignments: AssignmentV2[];
  groups: GuestGroupV2[];
  groupColorMap: Record<string, string>;
  onRemove: (assignmentId: string) => void;
  onAssign: (guestId: string, tableId: string) => void;
}

export const TablesGridView = ({
  tables,
  guests,
  assignments,
  groups,
  groupColorMap,
  onRemove,
  onAssign,
}: Props) => {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  // Build seated map: tableId -> guests, ordered by seat_position
  const guestsByTable = useMemo(() => {
    const map: Record<string, GuestV2[]> = {};
    for (const t of tables) map[t.id] = [];
    const guestById = new Map(guests.map((g) => [g.id, g]));
    const sorted = [...assignments].sort(
      (a, b) => (a.seat_position ?? 9999) - (b.seat_position ?? 9999)
    );
    for (const a of sorted) {
      const g = guestById.get(a.guest_id);
      if (g && map[a.table_id]) map[a.table_id].push(g);
    }
    return map;
  }, [tables, guests, assignments]);

  // Map guest_id -> assignment_id for removal
  const assignmentByGuest = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of assignments) m.set(a.guest_id, a.id);
    return m;
  }, [assignments]);

  const unassignedGuests = useMemo(
    () => guests.filter((g) => !assignmentByGuest.has(g.id)),
    [guests, assignmentByGuest]
  );

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;
  const selectedSeated = selectedTable ? guestsByTable[selectedTable.id] || [] : [];

  const handleRemoveSeated = (guestId: string) => {
    const aid = assignmentByGuest.get(guestId);
    if (aid) onRemove(aid);
  };

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[600px] rounded-xl overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
      <GuestPoolSidebar
        guests={unassignedGuests}
        groups={groups}
        groupColorMap={groupColorMap}
        search={search}
        onSearchChange={setSearch}
        filterGroup={filterGroup}
        onFilterGroupChange={setFilterGroup}
      />

      <main
        className="flex-1 overflow-auto px-6 pt-4 pb-20"
        style={{
          background: "hsl(var(--background))",
          backgroundImage:
            "radial-gradient(circle, hsl(var(--foreground) / 0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="flex justify-end mb-3">
          <div
            className="inline-flex rounded-md p-0.5"
            style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border))" }}
          >
            <Button
              size="sm"
              variant={view === "grid" ? "default" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Griglia
            </Button>
            <Button
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setView("list")}
            >
              <ListIcon className="w-3.5 h-3.5 mr-1" /> Lista
            </Button>
          </div>
        </div>

        {view === "grid" ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
          >
            {tables.map((t) => (
              <TableCardV2
                key={t.id}
                table={t}
                seated={guestsByTable[t.id] || []}
                selected={selectedTableId === t.id}
                groupColorMap={groupColorMap}
                onSelect={setSelectedTableId}
                onSeatClick={(g) => handleRemoveSeated(g.id)}
              />
            ))}
          </div>
        ) : (
          <TablesListView
            tables={tables}
            guestsByTable={guestsByTable}
            selectedTableId={selectedTableId}
            onSelect={setSelectedTableId}
            groupColorMap={groupColorMap}
          />
        )}
      </main>

      <TableDetailPanel
        table={selectedTable}
        seated={selectedSeated}
        unassigned={unassignedGuests}
        groups={groups}
        groupColorMap={groupColorMap}
        onClose={() => setSelectedTableId(null)}
        onRemove={handleRemoveSeated}
        onAssign={onAssign}
      />
    </div>
  );
};
