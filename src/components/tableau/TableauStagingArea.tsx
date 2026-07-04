import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import type { TableauRenderBlock } from "@/lib/tableauGeneratorEngine";

interface Props {
  staged: TableauRenderBlock[];
  onPlace: (tableId: string) => void;
}

export function TableauStagingArea({ staged, onPlace }: Props) {
  if (staged.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Tutti i tavoli sono posizionati sul tableau.
      </div>
    );
  }
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Da posizionare</h3>
        <Badge variant="secondary">{staged.length}</Badge>
      </div>
      {staged.map((b) => (
        <div key={b.tableId} className="border rounded p-2 space-y-2 bg-card">
          <div>
            <div className="font-medium text-sm">{b.title}</div>
            <div className="text-xs text-muted-foreground">{b.lines.length} ospiti</div>
          </div>
          <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => onPlace(b.tableId)}>
            <MapPin className="w-3 h-3" /> Posiziona
          </Button>
        </div>
      ))}
    </div>
  );
}
