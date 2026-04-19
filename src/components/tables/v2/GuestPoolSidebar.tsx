import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GuestV2, GuestGroupV2 } from "./types";
import { colorForGroup } from "./groupColors";

interface Props {
  guests: GuestV2[];
  groups: GuestGroupV2[];
  groupColorMap: Record<string, string>;
  search: string;
  onSearchChange: (s: string) => void;
  filterGroup: string | null;
  onFilterGroupChange: (g: string | null) => void;
}

export const GuestPoolSidebar = ({
  guests,
  groups,
  groupColorMap,
  search,
  onSearchChange,
  filterGroup,
  onFilterGroupChange,
}: Props) => {
  const filtered = guests.filter((g) => {
    if (filterGroup === "__none__" && g.group_id) return false;
    if (filterGroup && filterGroup !== "__none__" && g.group_id !== filterGroup) return false;
    if (search) {
      const q = search.toLowerCase();
      const full = `${g.first_name} ${g.last_name}`.toLowerCase();
      if (!full.includes(q)) return false;
    }
    return true;
  });

  const byGroup: Record<string, GuestV2[]> = {};
  filtered.forEach((g) => {
    const key = g.group_id || "__none__";
    (byGroup[key] = byGroup[key] || []).push(g);
  });

  return (
    <aside
      className="hidden lg:flex flex-col h-full flex-shrink-0"
      style={{
        width: 320,
        background: "hsl(var(--card))",
        borderRight: "1px solid hsl(var(--border))",
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="text-[11px] tracking-[0.14em] uppercase mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Da assegnare
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <div
            className="font-medium leading-tight flex-1 min-w-0"
            style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "hsl(var(--foreground))" }}
          >
            {guests.length === 0 ? "Tutti seduti 🎉" : "Trascina ai tavoli"}
          </div>
          <Badge
            variant={guests.length === 0 ? "default" : "outline"}
            className="whitespace-nowrap"
          >
            {guests.length} {guests.length === 1 ? "ospite" : "ospiti"}
          </Badge>
        </div>
      </div>

      <div className="px-3.5 py-3 border-b flex flex-col gap-2.5" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cerca nome…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <ChipBtn active={filterGroup === null} onClick={() => onFilterGroupChange(null)}>
            Tutti
          </ChipBtn>
          {groups.map((g) => {
            const color = colorForGroup(g.id, groupColorMap);
            return (
              <ChipBtn
                key={g.id}
                active={filterGroup === g.id}
                onClick={() => onFilterGroupChange(filterGroup === g.id ? null : g.id)}
                color={color}
              >
                <span
                  className="inline-block rounded-full mr-1"
                  style={{ width: 6, height: 6, background: color }}
                />
                {g.name}
              </ChipBtn>
            );
          })}
          <ChipBtn
            active={filterGroup === "__none__"}
            onClick={() =>
              onFilterGroupChange(filterGroup === "__none__" ? null : "__none__")
            }
          >
            Senza gruppo
          </ChipBtn>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2.5 pb-20 pt-2">
          {Object.entries(byGroup).map(([gid, items]) => {
            const grp = groups.find((g) => g.id === gid);
            const label = grp?.name || "Senza gruppo";
            const color = colorForGroup(gid === "__none__" ? null : gid, groupColorMap);
            return (
              <div key={gid} className="mb-3.5">
                <div
                  className="flex items-center gap-1.5 px-1.5 pt-1.5 pb-1 text-[11px] tracking-wider uppercase"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 6, height: 6, background: color }}
                  />
                  {label}
                  <span className="ml-auto" style={{ fontFamily: "var(--font-mono)" }}>
                    {items.length}
                  </span>
                </div>
                {items.map((guest) => (
                  <DraggableGuestChip key={guest.id} guest={guest} groupColorMap={groupColorMap} />
                ))}
              </div>
            );
          })}
          {filtered.length === 0 && guests.length > 0 && (
            <div className="p-6 text-center text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Nessuno trovato.
            </div>
          )}
          {guests.length === 0 && (
            <div className="px-5 py-10 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "hsl(var(--foreground))" }}>
                Tutti gli invitati sono seduti
              </div>
              <div className="text-xs mt-1.5 leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
                Puoi sempre rimuovere qualcuno dal tavolo per riassegnarlo qui.
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

const ChipBtn = ({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className="h-6 px-2 text-[11px] font-medium rounded-full inline-flex items-center transition-colors"
    style={{
      background: active ? "hsl(var(--accent))" : "hsl(var(--muted) / 0.2)",
      color: active ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
      border: active ? "1px solid hsl(var(--accent-foreground) / 0.2)" : "1px solid hsl(var(--border))",
    }}
  >
    {children}
  </button>
);

const DraggableGuestChip = ({
  guest,
  groupColorMap,
}: {
  guest: GuestV2;
  groupColorMap: Record<string, string>;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id });
  const color = colorForGroup(guest.group_id, groupColorMap);
  const initials = `${guest.first_name[0] || ""}${guest.last_name[0] || ""}`;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-1 text-[13px] cursor-grab active:cursor-grabbing transition-colors hover:bg-muted/40"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "var(--shadow-sm)",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <span
        className="rounded-full inline-flex items-center justify-center flex-shrink-0 text-[10px] font-semibold"
        style={{
          width: 24,
          height: 24,
          background: color + "22",
          color,
        }}
      >
        {initials}
      </span>
      <div className="flex-1 min-w-0">
        <div className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "hsl(var(--foreground))" }}>
          {guest.first_name} {guest.last_name}
        </div>
        {(guest.dietary_restrictions || guest.is_child) && (
          <div className="text-[10px] mt-px" style={{ color: "hsl(var(--muted-foreground))" }}>
            {guest.is_child && <span>👶 </span>}
            {guest.dietary_restrictions || ""}
          </div>
        )}
      </div>
      <GripVertical className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
    </div>
  );
};
