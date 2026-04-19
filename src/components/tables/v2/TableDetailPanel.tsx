import { useState } from "react";
import { X, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GuestV2, TableV2, GuestGroupV2 } from "./types";
import { colorForGroup } from "./groupColors";

interface Props {
  table: TableV2 | null;
  seated: GuestV2[];
  unassigned: GuestV2[];
  groups: GuestGroupV2[];
  groupColorMap: Record<string, string>;
  onClose: () => void;
  onRemove: (guestId: string) => void;
  onAssign: (guestId: string, tableId: string) => void;
}

export const TableDetailPanel = ({
  table,
  seated,
  unassigned,
  groups,
  groupColorMap,
  onClose,
  onRemove,
  onAssign,
}: Props) => {
  const [addSearch, setAddSearch] = useState("");
  const [addGroup, setAddGroup] = useState<string | null>(null);

  if (!table) return null;

  const remaining = table.capacity - seated.length;
  const isFull = remaining <= 0;
  const isImperial = table.shape?.toLowerCase() === "imperial" || table.table_type === "imperial";

  const available = unassigned.filter((g) => {
    if (addGroup && g.group_id !== addGroup) return false;
    if (addSearch) {
      const q = addSearch.toLowerCase();
      const full = `${g.first_name} ${g.last_name}`.toLowerCase();
      if (!full.includes(q)) return false;
    }
    return true;
  });

  return (
    <div
      className="fixed z-50 flex flex-col rounded-2xl"
      style={{
        right: 20,
        bottom: 20,
        width: 380,
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "var(--shadow-xl)",
        maxHeight: "calc(100vh - 200px)",
      }}
    >
      {/* header */}
      <div
        className="px-4 py-3.5 flex justify-between items-start gap-2.5 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[11px] tracking-[0.14em] uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>
            Tavolo
          </div>
          <div
            className="font-medium mt-0.5"
            style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "hsl(var(--foreground))" }}
          >
            {table.name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {isImperial ? "Imperiale" : "Tondo"} · {seated.length}/{table.capacity} posti
            {remaining > 0 && (
              <span>
                {" · "}
                <span style={{ color: "hsl(var(--status-confirmed))" }}>{remaining} liberi</span>
              </span>
            )}
            {isFull && (
              <span>
                {" · "}
                <span style={{ color: "hsl(var(--status-urgent))" }}>pieno</span>
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 flex-shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* seated */}
      <ScrollArea className="flex-shrink min-h-0" style={{ maxHeight: 240 }}>
        <div className="px-3 pt-2.5 pb-1.5">
          <div
            className="text-[11px] tracking-[0.12em] uppercase px-1.5 pt-1 pb-1.5"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Seduti ({seated.length})
          </div>
          {seated.length === 0 && (
            <div className="text-center py-3.5 text-xs italic" style={{ color: "hsl(var(--muted-foreground))" }}>
              Nessun ospite ancora.
            </div>
          )}
          {seated.map((g) => {
            const color = colorForGroup(g.group_id, groupColorMap);
            return (
              <div
                key={g.id}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-muted/40"
              >
                <span
                  className="rounded-full flex-shrink-0"
                  style={{ width: 8, height: 8, background: color }}
                />
                <span className="flex-1 text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {g.first_name} {g.last_name}
                </span>
                {g.dietary_restrictions && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {g.dietary_restrictions}
                  </Badge>
                )}
                {g.is_child && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    👶
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onRemove(g.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* add */}
      <div
        className="px-3 py-2.5 rounded-b-2xl border-t"
        style={{ background: "hsl(var(--muted) / 0.15)", borderColor: "hsl(var(--border))" }}
      >
        <div className="flex justify-between items-center px-1 pb-2">
          <div
            className="text-[11px] tracking-[0.12em] uppercase"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Aggiungi ospite
          </div>
          <span className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }}>
            {unassigned.length} da assegnare
          </span>
        </div>
        {unassigned.length === 0 ? (
          <div className="text-center py-3 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            Tutti gli ospiti sono già assegnati 🎉
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              <Input
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Cerca…"
                className="h-7 pl-8 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <MiniChip active={addGroup === null} onClick={() => setAddGroup(null)}>
                Tutti
              </MiniChip>
              {groups.map((g) => {
                const color = colorForGroup(g.id, groupColorMap);
                return (
                  <MiniChip
                    key={g.id}
                    active={addGroup === g.id}
                    onClick={() => setAddGroup(addGroup === g.id ? null : g.id)}
                    color={color}
                  >
                    <span
                      className="inline-block rounded-full mr-1"
                      style={{ width: 5, height: 5, background: color }}
                    />
                    {g.name}
                  </MiniChip>
                );
              })}
            </div>
            <ScrollArea style={{ maxHeight: 180 }}>
              <div className="flex flex-col gap-0.5 pr-2">
                {available.length === 0 && (
                  <div className="p-3 text-center text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Nessuno corrisponde.
                  </div>
                )}
                {available.map((g) => {
                  const color = colorForGroup(g.group_id, groupColorMap);
                  const initials = `${g.first_name[0] || ""}${g.last_name[0] || ""}`;
                  return (
                    <div
                      key={g.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px]"
                      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    >
                      <span
                        className="rounded-full inline-flex items-center justify-center flex-shrink-0 text-[10px] font-semibold"
                        style={{ width: 22, height: 22, background: color + "22", color }}
                      >
                        {initials}
                      </span>
                      <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                        {g.first_name} {g.last_name}
                      </span>
                      {g.dietary_restrictions && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {g.dietary_restrictions}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={isFull ? "ghost" : "default"}
                        disabled={isFull}
                        className="h-6 text-[11px] px-2"
                        onClick={() => onAssign(g.id, table.id)}
                      >
                        <Plus className="w-3 h-3 mr-0.5" />
                        {isFull ? "" : "Aggiungi"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
};

const MiniChip = ({
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
    className="h-[22px] px-2 text-[10.5px] font-medium rounded-full inline-flex items-center transition-colors"
    style={{
      background: active ? "hsl(var(--accent))" : "hsl(var(--card))",
      color: active ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
      border: active ? "1px solid hsl(var(--accent-foreground) / 0.2)" : "1px solid hsl(var(--border))",
    }}
  >
    {children}
  </button>
);
