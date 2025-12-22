import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  FilterSettingsDialog,
  FilterConfig,
  loadFilterSettings,
} from "./FilterSettingsDialog";

interface GuestGroup {
  id: string;
  name: string;
}

export interface GuestFilterValues {
  group: string;
  rsvpStatus: string;
  stdStatus: string;
  plusOne: string;
  grouping: string;
  contact: string;
  age: string;
  menu: string;
  staff: string;
  inviteStatus: string;
}

interface GuestFiltersProps {
  weddingId: string;
  values: GuestFilterValues;
  onChange: (key: keyof GuestFilterValues, value: string) => void;
  onReset: () => void;
}

export const DEFAULT_FILTER_VALUES: GuestFilterValues = {
  group: "all",
  rsvpStatus: "all",
  stdStatus: "all",
  plusOne: "all",
  grouping: "all",
  contact: "all",
  age: "all",
  menu: "all",
  staff: "all",
  inviteStatus: "all",
};

export function GuestFilters({
  weddingId,
  values,
  onChange,
  onReset,
}: GuestFiltersProps) {
  const [filterSettings, setFilterSettings] = useState<FilterConfig[]>(
    loadFilterSettings
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groups, setGroups] = useState<GuestGroup[]>([]);

  // Load groups for the dropdown
  useEffect(() => {
    if (weddingId) {
      supabase
        .from("guest_groups")
        .select("id, name")
        .eq("wedding_id", weddingId)
        .order("name")
        .then(({ data }) => {
          if (data) setGroups(data);
        });
    }
  }, [weddingId]);

  const enabledFilters = filterSettings.filter((f) => f.enabled);
  const hiddenFiltersCount = filterSettings.filter((f) => !f.enabled).length;

  // Count active filter values (non-"all")
  const activeFiltersCount = Object.entries(values).filter(
    ([key, val]) =>
      val !== "all" && enabledFilters.some((f) => f.id === key)
  ).length;

  const renderFilter = (filterId: string) => {
    switch (filterId) {
      case "group":
        return (
          <div className="space-y-1.5 min-w-[140px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">Gruppo</Label>
            <Select
              value={values.group}
              onValueChange={(v) => onChange("group", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i gruppi</SelectItem>
                <SelectItem value="no_group">Senza gruppo</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "rsvpStatus":
        return (
          <div className="space-y-1.5 min-w-[130px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">Stato RSVP</Label>
            <Select
              value={values.rsvpStatus}
              onValueChange={(v) => onChange("rsvpStatus", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="In attesa">In attesa</SelectItem>
                <SelectItem value="Confermato">Confermato</SelectItem>
                <SelectItem value="Rifiutato">Rifiutato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "stdStatus":
        return (
          <div className="space-y-1.5 min-w-[140px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">Save The Date</Label>
            <Select
              value={values.stdStatus}
              onValueChange={(v) => onChange("stdStatus", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="not_sent">Non inviato</SelectItem>
                <SelectItem value="sent">Inviato</SelectItem>
                <SelectItem value="responded_yes">Risposto (Sì)</SelectItem>
                <SelectItem value="responded_no">Risposto (No)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "plusOne":
        return (
          <div className="space-y-1.5 min-w-[140px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">+1 Accomp.</Label>
            <Select
              value={values.plusOne}
              onValueChange={(v) => onChange("plusOne", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="allowed">Con permesso +1</SelectItem>
                <SelectItem value="confirmed">+1 Confermato</SelectItem>
                <SelectItem value="not_allowed">Senza +1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "grouping":
        return (
          <div className="space-y-1.5 min-w-[130px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">Raggruppamento</Label>
            <Select
              value={values.grouping}
              onValueChange={(v) => onChange("grouping", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="grouped">Solo Raggruppati</SelectItem>
                <SelectItem value="singles">Solo Singoli</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-1.5 min-w-[130px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">Telefono</Label>
            <Select
              value={values.contact}
              onValueChange={(v) => onChange("contact", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="with_phone">Con numero</SelectItem>
                <SelectItem value="without_phone">Senza numero</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "age":
        return (
          <div className="space-y-1.5 min-w-[120px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">Tipo Invitato</Label>
            <Select
              value={values.age}
              onValueChange={(v) => onChange("age", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="adults">Solo Adulti</SelectItem>
                <SelectItem value="children">Solo Bambini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "menu":
        return (
          <div className="space-y-1.5 min-w-[130px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">Menu</Label>
            <Select
              value={values.menu}
              onValueChange={(v) => onChange("menu", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="vegetariano">Vegetariano</SelectItem>
                <SelectItem value="vegano">Vegano</SelectItem>
                <SelectItem value="bambini">Bambini</SelectItem>
                <SelectItem value="no_choice">Non scelto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "staff":
        return (
          <div className="space-y-1.5 min-w-[120px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">Ruolo</Label>
            <Select
              value={values.staff}
              onValueChange={(v) => onChange("staff", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="guests_only">Solo Invitati</SelectItem>
                <SelectItem value="staff_only">Solo Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "inviteStatus":
        return (
          <div className="space-y-1.5 min-w-[140px]" key={filterId}>
            <Label className="text-xs text-muted-foreground">Invito Formale</Label>
            <Select
              value={values.inviteStatus}
              onValueChange={(v) => onChange("inviteStatus", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="not_sent">Non inviato</SelectItem>
                <SelectItem value="sent">Inviato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        {enabledFilters.map((filter) => renderFilter(filter.id))}

        {/* Settings button with hidden filters count */}
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="w-4 h-4" />
            {hiddenFiltersCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                +{hiddenFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={onReset}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <FilterSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        filters={filterSettings}
        onFiltersChange={setFilterSettings}
      />
    </>
  );
}
