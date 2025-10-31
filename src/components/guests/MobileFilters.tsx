import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

interface Group {
  id: string;
  name: string;
}

interface MobileFiltersProps {
  filterStatus: string;
  filterGroup: string;
  groups: Group[];
  onStatusChange: (value: string) => void;
  onGroupChange: (value: string) => void;
}

export const MobileFilters = ({
  filterStatus,
  filterGroup,
  groups,
  onStatusChange,
  onGroupChange,
}: MobileFiltersProps) => {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = 
    (filterStatus !== "all" ? 1 : 0) + 
    (filterGroup !== "all" ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filtri
          {activeFiltersCount > 0 && (
            <Badge 
              className="ml-2 px-1.5 py-0 h-5 min-w-5 text-xs"
              variant="secondary"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[400px]">
        <SheetHeader>
          <SheetTitle>Filtri</SheetTitle>
          <SheetDescription>
            Filtra la lista degli invitati per stato e gruppo
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Stato RSVP</label>
            <Select value={filterStatus} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="confirmed">Confermati</SelectItem>
                <SelectItem value="declined">Rifiutati</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Gruppo</label>
            <Select value={filterGroup} onValueChange={onGroupChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i gruppi</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => {
              onStatusChange("all");
              onGroupChange("all");
              setOpen(false);
            }}
            variant="outline"
            className="w-full"
          >
            Reset Filtri
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
