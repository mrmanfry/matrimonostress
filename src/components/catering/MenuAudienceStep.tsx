import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer, Users, User } from "lucide-react";

export type MenuAudienceMode = 'table' | 'placecard';

export interface MenuTableTarget {
  tableId: string;
  tableName: string;
  guestCount: number;
}

export interface MenuGuestTarget {
  guestId: string;
  displayName: string;
  tableName: string | null;
  dietaryRestrictions: string | null;
}

interface MenuAudienceStepProps {
  mode: MenuAudienceMode;
  onModeChange: (mode: MenuAudienceMode) => void;
  tables: MenuTableTarget[];
  guests: MenuGuestTarget[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  printedIds: string[];
}

const MenuAudienceStep = ({
  mode,
  onModeChange,
  tables,
  guests,
  selectedIds,
  onSelectionChange,
  printedIds,
}: MenuAudienceStepProps) => {
  const [filter, setFilter] = useState<'all' | 'not_printed'>('all');

  const items = mode === 'table' ? tables : guests;
  const getId = (item: any) => mode === 'table' ? item.tableId : item.guestId;

  const filtered = useMemo(() => {
    const list = mode === 'table'
      ? tables.map(t => ({ id: t.tableId, name: t.tableName, detail: `${t.guestCount} ospiti`, dietary: null }))
      : guests.map(g => ({ id: g.guestId, name: g.displayName, detail: g.tableName || '—', dietary: g.dietaryRestrictions }));
    if (filter === 'not_printed') return list.filter(i => !printedIds.includes(i.id));
    return list;
  }, [mode, tables, guests, filter, printedIds]);

  const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.includes(i.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter(id => !filtered.some(i => i.id === id)));
    } else {
      const newIds = new Set(selectedIds);
      filtered.forEach(i => newIds.add(i.id));
      onSelectionChange(Array.from(newIds));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const notPrintedCount = (mode === 'table' ? tables.map(t => t.tableId) : guests.map(g => g.guestId))
    .filter(id => !printedIds.includes(id)).length;

  return (
    <div className="flex flex-col h-full">
      {/* Mode selector */}
      <div className="p-4 border-b border-border space-y-3">
        <RadioGroup value={mode} onValueChange={(v) => { onModeChange(v as MenuAudienceMode); onSelectionChange([]); }} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="table" id="mode-table" />
            <Label htmlFor="mode-table" className="flex items-center gap-1.5 cursor-pointer">
              <Users className="w-4 h-4" /> Per Tavolo ({tables.length})
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="placecard" id="mode-placecard" />
            <Label htmlFor="mode-placecard" className="flex items-center gap-1.5 cursor-pointer">
              <User className="w-4 h-4" /> Segnaposto ({guests.length})
            </Label>
          </div>
        </RadioGroup>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
          >
            Tutti
          </button>
          <button
            onClick={() => setFilter('not_printed')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === 'not_printed' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
          >
            Da Generare ({notPrintedCount})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>{mode === 'table' ? 'Tavolo' : 'Ospite'}</TableHead>
              <TableHead className="w-32 text-center">{mode === 'table' ? 'Ospiti' : 'Tavolo'}</TableHead>
              {mode === 'placecard' && <TableHead className="w-40">Dieta</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={mode === 'placecard' ? 4 : 3} className="text-center text-muted-foreground py-12">
                  {mode === 'table' ? 'Nessun tavolo trovato' : 'Nessun ospite confermato trovato'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleOne(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {printedIds.includes(item.id) && (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 text-muted-foreground border-muted-foreground/30">
                          <Printer className="w-3 h-3" />
                          Generato
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">{item.detail}</TableCell>
                  {mode === 'placecard' && (
                    <TableCell>
                      {item.dietary && (
                        <Badge variant="secondary" className="text-xs">{item.dietary}</Badge>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-card text-sm text-muted-foreground">
        Selezionati <strong className="text-foreground">{selectedIds.length}</strong> {mode === 'table' ? 'menu da tavolo' : 'segnaposto'}
      </div>
    </div>
  );
};

export default MenuAudienceStep;
