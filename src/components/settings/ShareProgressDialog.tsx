import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Share2, 
  Copy, 
  CheckCircle, 
  ExternalLink, 
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Building2,
  ListChecks,
  Clock
} from "lucide-react";

interface ProgressToken {
  id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  show_checklist: boolean;
  show_vendors: boolean;
  show_timeline: boolean;
  show_countdown: boolean;
}

interface ShareProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  existingToken?: ProgressToken | null;
  onTokenCreated: (token: ProgressToken) => void;
  onTokenDeleted: () => void;
}

export function ShareProgressDialog({
  open,
  onOpenChange,
  weddingId,
  existingToken,
  onTokenCreated,
  onTokenDeleted,
}: ShareProgressDialogProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    show_checklist: existingToken?.show_checklist ?? true,
    show_vendors: existingToken?.show_vendors ?? true,
    show_timeline: existingToken?.show_timeline ?? true,
    show_countdown: existingToken?.show_countdown ?? true,
  });
  const { toast } = useToast();

  const generateLink = async () => {
    setLoading(true);
    try {
      // Generate a unique token
      const token = `prog_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
      
      const { data, error } = await supabase
        .from("progress_tokens")
        .insert({
          wedding_id: weddingId,
          token,
          ...settings,
        })
        .select()
        .single();

      if (error) throw error;

      onTokenCreated(data);
      toast({
        title: "Link creato!",
        description: "Ora puoi condividerlo con parenti e amici.",
      });
    } catch (error: any) {
      console.error("Error creating token:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare il link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    if (!existingToken) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("progress_tokens")
        .update(settings)
        .eq("id", existingToken.id);

      if (error) throw error;

      onTokenCreated({ ...existingToken, ...settings });
      toast({
        title: "Salvato",
        description: "Impostazioni aggiornate",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteToken = async () => {
    if (!existingToken) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("progress_tokens")
        .delete()
        .eq("id", existingToken.id);

      if (error) throw error;

      onTokenDeleted();
      toast({
        title: "Link eliminato",
        description: "Il link non sarà più accessibile",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!existingToken) return;
    
    const url = `${window.location.origin}/progress/${existingToken.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Copiato!",
      description: "Link copiato negli appunti",
    });
  };

  const openLink = () => {
    if (!existingToken) return;
    window.open(`${window.location.origin}/progress/${existingToken.token}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Condividi Progresso
          </DialogTitle>
          <DialogDescription>
            Crea un link pubblico per condividere il progresso del matrimonio con parenti e amici.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visibility Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Cosa mostrare:</h4>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="countdown">Countdown</Label>
                </div>
                <Switch
                  id="countdown"
                  checked={settings.show_countdown}
                  onCheckedChange={(checked) => 
                    setSettings(s => ({ ...s, show_countdown: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <ListChecks className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="checklist">Progresso Checklist</Label>
                </div>
                <Switch
                  id="checklist"
                  checked={settings.show_checklist}
                  onCheckedChange={(checked) => 
                    setSettings(s => ({ ...s, show_checklist: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="vendors">Fornitori Confermati</Label>
                </div>
                <Switch
                  id="vendors"
                  checked={settings.show_vendors}
                  onCheckedChange={(checked) => 
                    setSettings(s => ({ ...s, show_vendors: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="timeline">Timeline del Giorno</Label>
                </div>
                <Switch
                  id="timeline"
                  checked={settings.show_timeline}
                  onCheckedChange={(checked) => 
                    setSettings(s => ({ ...s, show_timeline: checked }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Generated Link */}
          {existingToken ? (
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/progress/${existingToken.token}`}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={openLink}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Scade il: {new Date(existingToken.expires_at).toLocaleDateString("it-IT")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={deleteToken}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Elimina
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              onClick={generateLink}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Creazione..." : "Genera Link Pubblico"}
            </Button>
          )}
        </div>

        <DialogFooter>
          {existingToken && (
            <Button onClick={updateSettings} disabled={loading}>
              Salva Modifiche
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
