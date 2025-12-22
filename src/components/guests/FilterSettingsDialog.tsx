import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings2, RotateCcw } from "lucide-react";

export interface FilterConfig {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export const DEFAULT_FILTERS: FilterConfig[] = [
  { id: "group", label: "Gruppo / Categoria", description: "Filtra per gruppi assegnati", enabled: true },
  { id: "rsvpStatus", label: "Stato RSVP", description: "Confermato, In attesa, Rifiutato", enabled: true },
  { id: "stdStatus", label: "Save The Date", description: "Stato invio STD", enabled: true },
  { id: "plusOne", label: "Accompagnatore (+1)", description: "Permesso o confermato", enabled: true },
  { id: "grouping", label: "Tipo Raggruppamento", description: "Nuclei o singoli", enabled: false },
  { id: "contact", label: "Numero Telefono", description: "Con o senza contatto", enabled: false },
  { id: "age", label: "Tipo Invitato", description: "Adulti o bambini", enabled: false },
  { id: "menu", label: "Scelta Menu", description: "Standard, vegetariano, ecc.", enabled: false },
  { id: "staff", label: "Solo Staff", description: "Personale di servizio", enabled: false },
  { id: "inviteStatus", label: "Stato Invito Formale", description: "Invio invito ufficiale", enabled: false },
];

const STORAGE_KEY = "guest_filter_settings";

interface FilterSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
}

export function FilterSettingsDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: FilterSettingsDialogProps) {
  const [localFilters, setLocalFilters] = useState<FilterConfig[]>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, open]);

  const handleToggle = (filterId: string) => {
    setLocalFilters((prev) =>
      prev.map((f) =>
        f.id === filterId ? { ...f, enabled: !f.enabled } : f
      )
    );
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS);
  };

  const handleSave = () => {
    onFiltersChange(localFilters);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localFilters));
    onOpenChange(false);
  };

  const enabledCount = localFilters.filter((f) => f.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Personalizza Filtri
          </DialogTitle>
          <DialogDescription>
            Seleziona i filtri da mostrare nella barra ({enabledCount} attivi)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
          {localFilters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                id={filter.id}
                checked={filter.enabled}
                onCheckedChange={() => handleToggle(filter.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor={filter.id}
                  className="text-sm font-medium cursor-pointer"
                >
                  {filter.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filter.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Ripristina
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave}>Salva</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to load filters from localStorage
export function loadFilterSettings(): FilterConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as FilterConfig[];
      // Merge with defaults to handle new filters added in updates
      return DEFAULT_FILTERS.map((def) => {
        const saved = parsed.find((p) => p.id === def.id);
        return saved ? { ...def, enabled: saved.enabled } : def;
      });
    }
  } catch (e) {
    console.error("Error loading filter settings:", e);
  }
  return DEFAULT_FILTERS;
}
