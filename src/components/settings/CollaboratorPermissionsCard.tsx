import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Shield, Users, Package, Euro, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePermissions, type PermissionsConfig, type AreaPermission } from "@/contexts/AuthContext";

interface CollaboratorPermissionsCardProps {
  weddingId: string;
  collaboratorRoleIds: string[];
  collaboratorRole: "planner" | "manager";
  collaboratorName?: string;
  initialConfig: any; // accepts both old and new format
  onUpdated: () => void;
}

export function CollaboratorPermissionsCard({
  weddingId,
  collaboratorRoleIds,
  collaboratorRole,
  collaboratorName,
  initialConfig,
  onUpdated,
}: CollaboratorPermissionsCardProps) {
  const normalized = normalizePermissions(initialConfig);
  const [perms, setPerms] = useState<PermissionsConfig>(normalized);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { refreshAuth } = useAuth();

  const roleLabel = collaboratorRole === "planner" ? "Planner" : "Manager";

  const updatePerms = async (newPerms: PermissionsConfig) => {
    setSaving(true);
    try {
      // Enforce hierarchy: create → edit → view
      const enforce = (area: AreaPermission): AreaPermission => ({
        view: area.view || area.edit || area.create,
        edit: area.edit || area.create,
        create: area.create,
      });

      const enforced: PermissionsConfig = {
        guests: enforce(newPerms.guests),
        budget: enforce(newPerms.budget),
        vendors: enforce(newPerms.vendors),
        vendor_costs: enforce(newPerms.vendor_costs),
        communications: enforce(newPerms.communications),
      };

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

  const toggle = (area: keyof PermissionsConfig, level: keyof AreaPermission, value: boolean) => {
    const newPerms = { ...perms, [area]: { ...perms[area], [level]: value } };
    // If disabling view, disable everything
    if (level === "view" && !value) {
      newPerms[area] = { view: false, edit: false, create: false };
    }
    // If disabling edit, disable create too
    if (level === "edit" && !value) {
      newPerms[area] = { ...newPerms[area], edit: false, create: false };
    }
    // If enabling create, enable edit+view
    if (level === "create" && value) {
      newPerms[area] = { view: true, edit: true, create: true };
    }
    // If enabling edit, enable view
    if (level === "edit" && value) {
      newPerms[area] = { ...newPerms[area], view: true, edit: true };
    }
    updatePerms(newPerms);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
        <Shield className="w-5 h-5" />
        Permessi {roleLabel}{collaboratorName ? ` — ${collaboratorName}` : ""}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Controlla cosa può fare il {roleLabel} in ogni area
      </p>

      <div className="space-y-6">
        {/* Invitati */}
        <PermissionSection
          icon={<Users className="w-4 h-4" />}
          title="Invitati"
          area={perms.guests}
          saving={saving}
          onToggle={(level, value) => toggle("guests", level, value)}
          viewLabel="Visualizza lista (nome + iniziale cognome)"
          editLabel="Modifica invitati esistenti"
          createLabel="Crea nuovi invitati e importa"
        />

        <Separator />

        {/* Fornitori */}
        <PermissionSection
          icon={<Package className="w-4 h-4" />}
          title="Fornitori"
          area={perms.vendors}
          saving={saving}
          onToggle={(level, value) => toggle("vendors", level, value)}
          viewLabel="Visualizza schede fornitori"
          editLabel="Modifica fornitori esistenti"
          createLabel="Crea nuovi fornitori"
        />

        {/* Sub-area: Costi Fornitori */}
        <div className="ml-6 pl-4 border-l-2 border-muted">
          <ToggleRow
            label="Costi e Pagamenti"
            description="Se disattivo, nasconde cifre e piani di pagamento"
            checked={perms.vendor_costs.view}
            disabled={saving || !perms.vendors.view}
            onCheckedChange={(v) => toggle("vendor_costs", "view", v)}
          />
        </div>

        <Separator />

        {/* Budget */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Euro className="w-4 h-4" />
            Budget e Tesoreria
          </div>
          <ToggleRow
            label="Visualizza"
            description="Accesso a Budget e Tesoreria"
            checked={perms.budget.view}
            disabled={saving}
            onCheckedChange={(v) => toggle("budget", "view", v)}
          />
        </div>

        <Separator />

        {/* Comunicazioni */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="w-4 h-4" />
            Comunicazioni
          </div>
          <ToggleRow
            label="Visualizza e Gestisci"
            description="Accesso a campagne RSVP e Save the Date"
            checked={perms.communications.view}
            disabled={saving}
            onCheckedChange={(v) => {
              // Communications is all-or-nothing
              const full = v ? { view: true, edit: true, create: true } : { view: false, edit: false, create: false };
              updatePerms({ ...perms, communications: full });
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
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

function PermissionSection({
  icon,
  title,
  area,
  saving,
  onToggle,
  viewLabel,
  editLabel,
  createLabel,
}: {
  icon: React.ReactNode;
  title: string;
  area: AreaPermission;
  saving: boolean;
  onToggle: (level: keyof AreaPermission, value: boolean) => void;
  viewLabel: string;
  editLabel: string;
  createLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="space-y-2 ml-6">
        <ToggleRow
          label="Visualizza"
          description={viewLabel}
          checked={area.view}
          disabled={saving}
          onCheckedChange={(v) => onToggle("view", v)}
        />
        <ToggleRow
          label="Modifica"
          description={editLabel}
          checked={area.edit}
          disabled={saving || !area.view}
          onCheckedChange={(v) => onToggle("edit", v)}
        />
        <ToggleRow
          label="Crea"
          description={createLabel}
          checked={area.create}
          disabled={saving || !area.edit}
          onCheckedChange={(v) => onToggle("create", v)}
        />
      </div>
    </div>
  );
}
