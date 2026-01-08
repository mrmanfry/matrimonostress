import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Bell, UserCircle } from "lucide-react";

interface AccountSettingsCardProps {
  wedding: {
    id: string;
    partner1_name: string;
    partner2_name: string;
  } | null;
  currentUserId: string | null;
  onUpdate?: () => void;
}

export const AccountSettingsCard = ({ wedding, currentUserId, onUpdate }: AccountSettingsCardProps) => {
  const [userEmail, setUserEmail] = useState<string>("");
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [partnerRole, setPartnerRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAccountSettings();
  }, [currentUserId, wedding?.id]);

  const loadAccountSettings = async () => {
    if (!currentUserId || !wedding?.id) return;
    
    setLoading(true);
    try {
      // Get user email
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      // Get profile preferences
      const { data: profile } = await supabase
        .from("profiles")
        .select("digest_enabled")
        .eq("id", currentUserId)
        .single();

      if (profile) {
        setDigestEnabled(profile.digest_enabled ?? true);
      }

      // Get partner_role from user_roles
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("partner_role")
        .eq("user_id", currentUserId)
        .eq("wedding_id", wedding.id)
        .single();

      if (roleData) {
        setPartnerRole(roleData.partner_role);
      }
    } catch (error) {
      console.error("Error loading account settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDigestPreference = async (enabled: boolean) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ digest_enabled: enabled })
        .eq("id", currentUserId);

      if (error) throw error;

      setDigestEnabled(enabled);
      toast({
        title: enabled ? "Digest attivato" : "Digest disattivato",
        description: enabled 
          ? "Riceverai il riepilogo settimanale via email"
          : "Non riceverai più il digest settimanale",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSavePartnerRole = async (role: string) => {
    if (!currentUserId || !wedding?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ partner_role: role })
        .eq("user_id", currentUserId)
        .eq("wedding_id", wedding.id);

      if (error) throw error;

      setPartnerRole(role);
      toast({
        title: "Ruolo aggiornato",
        description: `Sei stato mappato come ${role === 'partner1' ? wedding.partner1_name : wedding.partner2_name}`,
      });
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Il Mio Account
        </CardTitle>
        <CardDescription>
          Gestisci le preferenze del tuo account personale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            Email Account
          </Label>
          <Input 
            value={userEmail} 
            readOnly 
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">
            L'email non può essere modificata da qui
          </p>
        </div>

        {/* Partner Role Mapping */}
        {wedding && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <UserCircle className="w-4 h-4" />
              Ruolo nel Matrimonio
            </Label>
            <Select 
              value={partnerRole || ""} 
              onValueChange={handleSavePartnerRole}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona chi sei..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner1">
                  Sono {wedding.partner1_name} (Partner 1)
                </SelectItem>
                <SelectItem value="partner2">
                  Sono {wedding.partner2_name} (Partner 2)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Questo determina quali task ti vengono assegnati nel digest settimanale
            </p>
          </div>
        )}

        {/* Digest Preference */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 font-medium">
              <Bell className="w-4 h-4" />
              Digest Settimanale
            </Label>
            <p className="text-sm text-muted-foreground">
              Ricevi ogni lunedì un riepilogo dei task e pagamenti in scadenza
            </p>
          </div>
          <Switch
            checked={digestEnabled}
            onCheckedChange={handleSaveDigestPreference}
          />
        </div>

        {/* Info box */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Tip:</strong> Selezionando il tuo ruolo, riceverai solo i task assegnati a te nel digest settimanale, più quelli condivisi con il/la partner.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
