import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Shield, Users, Package, Euro, MessageSquare, Send, CheckSquare, Calendar,
  UtensilsCrossed, ChefHat, Hotel, Camera, BookOpen, Gift, MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  useAuth,
  normalizePermissions,
  PERMISSION_AREAS,
  type PermissionsConfig,
  type PermissionArea,
  type AreaPermission,
} from "@/contexts/AuthContext";

interface CollaboratorPermissionsCardProps {
  weddingId: string;
  collaboratorRoleIds: string[];
  collaboratorRole: "planner" | "manager";
  collaboratorName?: string;
  initialConfig: any;
  onUpdated: () => void;
}

type AreaSpec = {
  key: PermissionArea;
  title: string;
  icon: React.ReactNode;
  viewLabel: string;
  editLabel?: string;      // se assente, area sola-view
  createLabel?: string;    // se assente, area senza livello create
  parent?: PermissionArea; // dipende da un altro toggle (es. vendor_costs → vendors)
};

const AREAS: AreaSpec[] = [
  { key: "guests", title: "Invitati", icon: <Users className="w-4 h-4" />,
    viewLabel: "Visualizza lista (nome + iniziale cognome)",
    editLabel: "Modifica invitati esistenti",
    createLabel: "Crea nuovi invitati e importa" },
  { key: "communications", title: "Campagne & Comunicazioni", icon: <Send className="w-4 h-4" />,
    viewLabel: "Vede campagne RSVP e Save the Date",
    editLabel: "Modifica campagne",
    createLabel: "Crea e invia campagne" },
  { key: "budget", title: "Budget & Tesoreria", icon: <Euro className="w-4 h-4" />,
    viewLabel: "Accesso a Budget e Tesoreria",
    editLabel: "Segna pagato, modifica rate",
    createLabel: "Crea nuove voci di spesa e pagamenti" },
  { key: "gifts", title: "Regali", icon: <Gift className="w-4 h-4" />,
    viewLabel: "Vede regali ricevuti",
    editLabel: "Modifica regali",
    createLabel: "Registra nuovi regali" },
  { key: "vendors", title: "Fornitori", icon: <Package className="w-4 h-4" />,
    viewLabel: "Visualizza schede fornitori",
    editLabel: "Modifica fornitori esistenti",
    createLabel: "Crea nuovi fornitori" },
  { key: "vendor_costs", title: "Costi & Pagamenti fornitori", icon: <Euro className="w-4 h-4" />,
    viewLabel: "Se disattivo, nasconde cifre e piani di pagamento nei fornitori",
    parent: "vendors" },
  { key: "checklist", title: "Checklist", icon: <CheckSquare className="w-4 h-4" />,
    viewLabel: "Vede la checklist",
    editLabel: "Modifica task esistenti",
    createLabel: "Crea nuovi task" },
  { key: "chat", title: "Messaggi", icon: <MessageCircle className="w-4 h-4" />,
    viewLabel: "Accesso ai messaggi del matrimonio",
    editLabel: "Invia e modifica propri messaggi" },
  { key: "calendar", title: "Calendario", icon: <Calendar className="w-4 h-4" />,
    viewLabel: "Vede appuntamenti e scadenze",
    editLabel: "Modifica eventi esistenti",
    createLabel: "Crea nuovi eventi" },
  { key: "tables", title: "Tavoli & Tableau", icon: <UtensilsCrossed className="w-4 h-4" />,
    viewLabel: "Vede tavoli e disposizione",
    editLabel: "Modifica assegnazioni",
    createLabel: "Crea tavoli e tableau" },
  { key: "catering", title: "Catering", icon: <ChefHat className="w-4 h-4" />,
    viewLabel: "Vede menù e diete",
    editLabel: "Modifica preferenze alimentari",
    createLabel: "Configura menù" },
  { key: "accommodation", title: "Pernottamento", icon: <Hotel className="w-4 h-4" />,
    viewLabel: "Vede hotel e camere",
    editLabel: "Modifica assegnazioni camere",
    createLabel: "Aggiunge hotel e camere" },
  { key: "memories", title: "Memories Reel", icon: <Camera className="w-4 h-4" />,
    viewLabel: "Vede foto della camera monouso",
    editLabel: "Gestisce configurazione camera",
    createLabel: "Crea nuove camere / esporta" },
  { key: "mass_booklet", title: "Libretto Messa", icon: <BookOpen className="w-4 h-4" />,
    viewLabel: "Vede libretti creati",
    editLabel: "Modifica libretti esistenti",
    createLabel: "Crea nuovi libretti" },
  { key: "timeline", title: "Timeline evento", icon: <Calendar className="w-4 h-4" />,
    viewLabel: "Vede la timeline del giorno",
    editLabel: "Modifica eventi timeline",
    createLabel: "Crea eventi timeline" },
];

// Sanity check: nessuna area del modello dimenticata nella UI.
if (import.meta.env.DEV) {
  const covered = new Set(AREAS.map(a => a.key));
  for (const k of PERMISSION_AREAS) {
    if (!covered.has(k)) console.warn(`[CollaboratorPermissions] area '${k}' senza UI`);
  }
}

function enforce(area: AreaPermission): AreaPermission {
  return {
    view: area.view || area.edit || area.create,
    edit: area.edit || area.create,
    create: area.create,
  };
}

const PRESETS: Record<string, () => PermissionsConfig> = {
  none: () => PERMISSION_AREAS.reduce((acc, k) => {
    acc[k] = { view: false, edit: false, create: false };
    return acc;
  }, {} as PermissionsConfig),
  readonly: () => PERMISSION_AREAS.reduce((acc, k) => {
    acc[k] = { view: true, edit: false, create: false };
    return acc;
  }, {} as PermissionsConfig),
  operator: () => PERMISSION_AREAS.reduce((acc, k) => {
    acc[k] = { view: true, edit: true, create: true };
    return acc;
  }, {} as PermissionsConfig),
};

export function CollaboratorPermissionsCard({
  weddingId,
  collaboratorRoleIds,
  collaboratorRole,
  collaboratorName,
  initialConfig,
  onUpdated,
}: CollaboratorPermissionsCardProps) {
  const [perms, setPerms] = useState<PermissionsConfig>(normalizePermissions(initialConfig));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { refreshAuth } = useAuth();

  const roleLabel = collaboratorRole === "planner" ? "Planner" : "Manager";

  const persist = async (newPerms: PermissionsConfig) => {
    setSaving(true);
    try {
      const enforced = PERMISSION_AREAS.reduce((acc, k) => {
        acc[k] = enforce(newPerms[k]);
        return acc;
      }, {} as PermissionsConfig);

      for (const roleId of collaboratorRoleIds) {
        const { error } = await supabase
          .from("user_roles")
          .update({ permissions_config: enforced as any })
          .eq("id", roleId);
        if (error) throw error;
      }

      setPerms(enforced);
      toast({ title: "Permessi aggiornati", description: "Le modifiche sono state salvate" });
      await refreshAuth();
      onUpdated();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message || "Impossibile aggiornare", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (area: PermissionArea, level: keyof AreaPermission, value: boolean) => {
    const next = { ...perms, [area]: { ...perms[area], [level]: value } };
    if (level === "view" && !value) next[area] = { view: false, edit: false, create: false };
    if (level === "edit" && !value) next[area] = { ...next[area], edit: false, create: false };
    if (level === "create" && value) next[area] = { view: true, edit: true, create: true };
    if (level === "edit" && value) next[area] = { ...next[area], view: true, edit: true };
    persist(next);
  };

  const applyPreset = (name: keyof typeof PRESETS) => persist(PRESETS[name]());

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Permessi {roleLabel}{collaboratorName ? ` — ${collaboratorName}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            Controlla cosa può fare in ogni area. Sezioni senza <em>visualizza</em> vengono nascoste dalla barra laterale.
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="sm" variant="outline" disabled={saving} onClick={() => applyPreset("none")}>Nessuno</Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => applyPreset("readonly")}>Sola lettura</Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => applyPreset("operator")}>Operativo</Button>
        </div>
      </div>

      <div className="space-y-5">
        {AREAS.map((spec, idx) => {
          const parentDisabled = spec.parent ? !perms[spec.parent].view : false;
          const area = perms[spec.key];
          const soloView = !spec.editLabel;
          return (
            <div key={spec.key}>
              {idx > 0 && !spec.parent && <Separator className="mb-5" />}
              <div className={spec.parent ? "ml-6 pl-4 border-l-2 border-muted space-y-2" : "space-y-3"}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {spec.icon}
                  {spec.title}
                </div>
                <div className={spec.parent ? "" : "space-y-2 ml-6"}>
                  <ToggleRow
                    label={soloView ? "Attivo" : "Visualizza"}
                    description={spec.viewLabel}
                    checked={area.view}
                    disabled={saving || parentDisabled}
                    onCheckedChange={(v) => toggle(spec.key, "view", v)}
                  />
                  {spec.editLabel && (
                    <ToggleRow
                      label="Modifica"
                      description={spec.editLabel}
                      checked={area.edit}
                      disabled={saving || !area.view}
                      onCheckedChange={(v) => toggle(spec.key, "edit", v)}
                    />
                  )}
                  {spec.createLabel && (
                    <ToggleRow
                      label="Crea"
                      description={spec.createLabel}
                      checked={area.create}
                      disabled={saving || !area.edit}
                      onCheckedChange={(v) => toggle(spec.key, "create", v)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ToggleRow({
  label, description, checked, disabled, onCheckedChange,
}: {
  label: string; description: string; checked: boolean; disabled: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
