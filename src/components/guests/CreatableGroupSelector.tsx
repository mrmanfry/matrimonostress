import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Group {
  id: string;
  name: string;
}

interface CreatableGroupSelectorProps {
  weddingId: string;
  value: string | null;
  onValueChange: (groupId: string | null) => void;
  disabled?: boolean;
}

export function CreatableGroupSelector({
  weddingId,
  value,
  onValueChange,
  disabled = false,
}: CreatableGroupSelectorProps) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch groups on mount and when weddingId changes
  useEffect(() => {
    if (weddingId) {
      fetchGroups();
    }
  }, [weddingId]);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("guest_groups")
      .select("id, name")
      .eq("wedding_id", weddingId)
      .order("name");

    if (error) {
      console.error("Error fetching groups:", error);
      return;
    }

    setGroups(data || []);
  };

  const createNewGroup = async (name: string) => {
    if (!weddingId || !name.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("guest_groups")
        .insert({ name: name.trim(), wedding_id: weddingId })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Gruppo "${name}" creato`);
      setGroups((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      onValueChange(data.id);
      setSearchValue("");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Impossibile creare il gruppo");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === value);

  // Filter groups based on search
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Check if we should show "Create new" option
  const exactMatch = groups.some(
    (g) => g.name.toLowerCase() === searchValue.toLowerCase()
  );
  const showCreateOption = searchValue.trim() && !exactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedGroup ? (
            <span className="truncate">{selectedGroup.name}</span>
          ) : (
            <span className="text-muted-foreground">Seleziona o crea gruppo...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca o crea gruppo..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>
              {searchValue.trim() ? (
                <button
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm text-left hover:bg-accent rounded cursor-pointer"
                  onClick={() => createNewGroup(searchValue)}
                  disabled={isCreating}
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span>Crea "{searchValue}"</span>
                </button>
              ) : (
                "Nessun gruppo trovato"
              )}
            </CommandEmpty>
            <CommandGroup>
              {/* Create new option at top when searching */}
              {showCreateOption && (
                <CommandItem
                  value={`__create__${searchValue}`}
                  onSelect={() => createNewGroup(searchValue)}
                  disabled={isCreating}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crea "{searchValue}"
                </CommandItem>
              )}

              {/* Remove group option */}
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                  setSearchValue("");
                }}
              >
                <X className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Nessun gruppo</span>
              </CommandItem>

              {/* Existing groups */}
              {filteredGroups.map((group) => (
                <CommandItem
                  key={group.id}
                  value={group.id}
                  onSelect={() => {
                    onValueChange(group.id);
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === group.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {group.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
