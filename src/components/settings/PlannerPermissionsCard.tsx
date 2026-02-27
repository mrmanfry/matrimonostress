import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface PlannerPermissionsCardProps {
  weddingId: string;
  plannerRoleIds: string[];
  initialConfig: {
    budget_visible: boolean;
    vendor_costs_visible: boolean;
  };
  onUpdated: () => void;
}

export function PlannerPermissionsCard({
  weddingId,
  plannerRoleIds,
  initialConfig,
  onUpdated,
}: PlannerPermissionsCardProps) {
  const [budgetVisible, setBudgetVisible] = useState(initialConfig.budget_visible);
  const [vendorCostsVisible, setVendorCostsVisible] = useState(initialConfig.vendor_costs_visible);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { refreshAuth } = useAuth();

  const updatePermissions = async (key: string, value: boolean) => {
    setSaving(true);
    try {
      const newConfig = {
        budget_visible: key === "budget_visible" ? value : budgetVisible,
        vendor_costs_visible: key === "vendor_costs_visible" ? value : vendorCostsVisible,
      };

      // Update all planner roles for this wedding
      for (const roleId of plannerRoleIds) {
        const { error } = await supabase
          .from("user_roles")
          .update({ permissions_config: newConfig as any })
          .eq("id", roleId);
        if (error) throw error;
      }

      if (key === "budget_visible") setBudgetVisible(value);
      if (key === "vendor_costs_visible") setVendorCostsVisible(value);

      toast({
        title: "Permessi aggiornati",
        description: "Le modifiche sono state salvate",
      });

      await refreshAuth();
      onUpdated();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare i permessi",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
        <Shield className="w-5 h-5" />
        Permessi Planner
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Controlla cosa può vedere il Planner professionista
      </p>

      <div className="space-y-6">
        {/* Budget toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">Gestione Budget Globale</Label>
            <p className="text-sm text-muted-foreground">
              Se attivo, il Planner può vedere Tesoreria e Budget
            </p>
          </div>
          <Switch
            checked={budgetVisible}
            onCheckedChange={(v) => updatePermissions("budget_visible", v)}
            disabled={saving}
          />
        </div>

        {/* Vendor costs toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base font-medium">Costi e Pagamenti Fornitori</Label>
              <p className="text-sm text-muted-foreground">
                Se disattivi, il Planner non vedrà cifre e piani di pagamento dei fornitori
              </p>
            </div>
            <Switch
              checked={vendorCostsVisible}
              onCheckedChange={(v) => updatePermissions("vendor_costs_visible", v)}
              disabled={saving}
            />
          </div>
          {!vendorCostsVisible && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-800 dark:text-orange-300">
                Attenzione: il Planner non potrà ricordarti le scadenze dei pagamenti
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </Card>
  );
}
