import { useEffect, useMemo, useState } from "react";
import { Plus, X, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MassBookletContent } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  onChange: (patch: Partial<MassBookletContent>) => void;
}

interface GuestOption {
  id: string;
  label: string;
}

function GuestCombobox({
  value,
  onChange,
  guests,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  guests: GuestOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return guests;
    const q = search.toLowerCase();
    return guests.filter((g) => g.label.toLowerCase().includes(q));
  }, [guests, search]);

  const selectedLabel = guests.find((g) => g.label === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder || "Seleziona o scrivi..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca invitato o scrivi nome..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-left hover:bg-accent rounded"
                  onClick={() => {
                    onChange(search.trim());
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  Usa "<span className="font-medium">{search.trim()}</span>"
                </button>
              ) : (
                <span className="text-muted-foreground text-xs">Nessun invitato trovato</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((g) => (
                <CommandItem
                  key={g.id}
                  value={g.id}
                  onSelect={() => {
                    onChange(g.label);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === g.label ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {g.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function GuestArrayField({
  label,
  values,
  onChange,
  guests,
  placeholder,
  max = 4,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  guests: GuestOption[];
  placeholder?: string;
  max?: number;
}) {
  const add = () => onChange([...values, ""]);
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <div className="flex-1">
            <GuestCombobox
              value={v}
              onChange={(val) => update(i, val)}
              guests={guests}
              placeholder={placeholder}
            />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {values.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Aggiungi
        </Button>
      )}
    </div>
  );
}

export default function BookletStepSetup({ content, onChange }: Props) {
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.activeWeddingId : null;
  const [guests, setGuests] = useState<GuestOption[]>([]);

  useEffect(() => {
    if (!weddingId) return;
    supabase
      .from("guests")
      .select("id, first_name, last_name")
      .eq("wedding_id", weddingId)
      .eq("is_couple_member", false)
      .order("first_name")
      .then(({ data }) => {
        if (data) {
          setGuests(
            data.map((g) => ({
              id: g.id,
              label: `${g.first_name} ${g.last_name}`.trim(),
            }))
          );
        }
      });
  }, [weddingId]);

  const updateRoles = (patch: Partial<MassBookletContent["roles"]>) =>
    onChange({ roles: { ...content.roles, ...patch } });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold mb-1">Setup della Cerimonia</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Inserisci le informazioni di base. Questi dati appariranno sulla copertina e nelle intestazioni del libretto.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="church">Nome della Chiesa *</Label>
          <Input
            id="church"
            value={content.church_name}
            onChange={(e) => onChange({ church_name: e.target.value })}
            placeholder="es. Chiesa di San Marco"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priest">Nome del Celebrante *</Label>
          <Input
            id="priest"
            value={content.priest_name}
            onChange={(e) => onChange({ priest_name: e.target.value })}
            placeholder="es. Don Marco Rossi"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date_text">Data della Cerimonia (testo per il libretto)</Label>
        <Input
          id="date_text"
          value={content.ceremony_date_text}
          onChange={(e) => onChange({ ceremony_date_text: e.target.value })}
          placeholder="es. Sabato 20 Settembre 2026"
        />
      </div>

      <hr className="border-border" />

      <div>
        <h3 className="text-sm font-semibold mb-3">Ruoli</h3>
        <div className="space-y-5">
          <GuestArrayField
            label="Testimoni Sposo"
            values={content.roles.witnesses_groom}
            onChange={(v) => updateRoles({ witnesses_groom: v })}
            guests={guests}
            placeholder="Seleziona invitato o scrivi nome"
          />
          <GuestArrayField
            label="Testimoni Sposa"
            values={content.roles.witnesses_bride}
            onChange={(v) => updateRoles({ witnesses_bride: v })}
            guests={guests}
            placeholder="Seleziona invitato o scrivi nome"
          />
          <GuestArrayField
            label="Lettori"
            values={content.roles.readers}
            onChange={(v) => updateRoles({ readers: v })}
            guests={guests}
            placeholder="Seleziona invitato o scrivi nome"
            max={6}
          />
          <div className="space-y-1.5">
            <Label htmlFor="musicians">Musicisti</Label>
            <Input
              id="musicians"
              value={content.roles.musicians}
              onChange={(e) => updateRoles({ musicians: e.target.value })}
              placeholder="es. Quartetto d'archi, Coro parrocchiale"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
