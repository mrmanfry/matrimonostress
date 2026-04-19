import { Badge } from "@/components/ui/badge";
import type { GuestV2, TableV2 } from "./types";
import { colorForGroup } from "./groupColors";

interface Props {
  tables: TableV2[];
  guestsByTable: Record<string, GuestV2[]>;
  selectedTableId: string | null;
  onSelect: (id: string) => void;
  groupColorMap: Record<string, string>;
}

export const TablesListView = ({
  tables,
  guestsByTable,
  selectedTableId,
  onSelect,
  groupColorMap,
}: Props) => {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-2">
      {tables.map((t) => {
        const seated = guestsByTable[t.id] || [];
        const isImperial = t.shape?.toLowerCase() === "imperial" || t.table_type === "imperial";
        const isSelected = selectedTableId === t.id;
        return (
          <div
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="rounded-xl px-4 py-3.5 flex items-center gap-3.5 cursor-pointer transition-colors"
            style={{
              background: "hsl(var(--card))",
              border: isSelected
                ? "1.5px solid hsl(var(--primary))"
                : "1px solid hsl(var(--border))",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              className="flex-shrink-0"
              style={{
                width: 38,
                height: 38,
                borderRadius: isImperial ? 6 : 999,
                background: "hsl(var(--muted) / 0.2)",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <div className="flex-1 min-w-0">
              <div
                className="font-medium"
                style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "hsl(var(--foreground))" }}
              >
                {t.name}
              </div>
              <div className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                {isImperial ? "Imperiale" : "Tondo"} · {seated.length}/{t.capacity}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 max-w-[50%] justify-end">
              {seated.slice(0, 5).map((g) => {
                const color = colorForGroup(g.group_id, groupColorMap);
                return (
                  <Badge
                    key={g.id}
                    variant="outline"
                    className="text-[10px] h-5"
                    style={{
                      background: color + "15",
                      color,
                      borderColor: color + "33",
                    }}
                  >
                    {g.first_name}
                  </Badge>
                );
              })}
              {seated.length > 5 && (
                <Badge variant="outline" className="text-[10px] h-5">
                  +{seated.length - 5}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
