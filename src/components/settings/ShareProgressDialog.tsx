import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Share2,
  Copy,
  CheckCircle,
  ExternalLink,
  Trash2,
  Plus,
  Users,
  Wrench,
  Heart,
  Clock,
  MapPin,
  Shirt,
  QrCode,
  Calendar,
  Phone,
  Hash,
} from "lucide-react";

type Audience = "guests" | "vendors";

interface ProgressToken {
  id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  audience: Audience;
  label: string | null;
  show_countdown: boolean;
  show_timeline: boolean;
  show_location: boolean;
  show_dress_code: boolean;
  show_memories_qr: boolean;
  show_addresses: boolean;
  show_vendor_contacts: boolean;
  show_operational_numbers: boolean;
}

interface ShareProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
}

const guestsDefaults = {
  show_countdown: true,
  show_timeline: true,
  show_location: true,
  show_dress_code: true,
  show_memories_qr: true,
};

const vendorsDefaults = {
  show_timeline: true,
  show_addresses: true,
  show_vendor_contacts: true,
  show_operational_numbers: true,
};

export function ShareProgressDialog({ open, onOpenChange, weddingId }: ShareProgressDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<ProgressToken[]>([]);
  const [audience, setAudience] = useState<Audience>("guests");
  const [newLabel, setNewLabel] = useState("");
  const [newSettings, setNewSettings] = useState<Record<string, boolean>>(guestsDefaults);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && weddingId) {
      loadTokens();
    }
  }, [open, weddingId]);

  useEffect(() => {
    setNewSettings(audience === "guests" ? { ...guestsDefaults } : { ...vendorsDefaults });
    setNewLabel("");
    setShowForm(false);
  }, [audience]);

  const loadTokens = async () => {
    const { data } = await supabase
      .from("progress_tokens")
      .select("*")
      .eq("wedding_id", weddingId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setTokens((data as any) || []);
  };

  const createLink = async () => {
    setLoading(true);
    try {
      const token = `prog_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const payload: any = {
        wedding_id: weddingId,
        token,
        audience,
        label: newLabel.trim() || null,
        ...newSettings,
      };
      const { error } = await supabase.from("progress_tokens").insert(payload);
      if (error) throw error;
      toast({ title: "Link creato", description: "Il link è pronto per essere condiviso" });
      setShowForm(false);
      setNewLabel("");
      setNewSettings(audience === "guests" ? { ...guestsDefaults } : { ...vendorsDefaults });
      loadTokens();
    } catch (e: any) {
      toast({ title: "Errore", description: e.message || "Impossibile creare il link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteToken = async (id: string) => {
    const { error } = await supabase.from("progress_tokens").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare", variant: "destructive" });
      return;
    }
    toast({ title: "Link eliminato" });
    loadTokens();
  };

  const copyLink = (t: ProgressToken) => {
    const url = `${window.location.origin}/progress/${t.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copiato!", description: "Link copiato negli appunti" });
  };

  const guestTokens = tokens.filter((t) => t.audience === "guests");
  const vendorTokens = tokens.filter((t) => t.audience === "vendors");

  const renderTokenCard = (t: ProgressToken) => {
    const url = `${window.location.origin}/progress/${t.token}`;
    return (
      <Card key={t.id} className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{t.label || (t.audience === "guests" ? "Link Ospiti" : "Link Fornitori")}</p>
            <p className="text-xs text-muted-foreground">
              Scade il {new Date(t.expires_at).toLocaleDateString("it-IT")}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {t.audience === "guests" ? <Heart className="w-3 h-3 mr-1" /> : <Wrench className="w-3 h-3 mr-1" />}
            {t.audience === "guests" ? "Ospiti" : "Fornitori"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input readOnly value={url} className="text-xs" />
          <Button variant="outline" size="icon" onClick={() => copyLink(t)}>
            {copiedId === t.id ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.open(url, "_blank")}>
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => deleteToken(t.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  };

  const guestToggles: { key: keyof typeof guestsDefaults; icon: any; label: string }[] = [
    { key: "show_countdown", icon: Clock, label: "Countdown al matrimonio" },
    { key: "show_timeline", icon: Calendar, label: "Programma del giorno" },
    { key: "show_location", icon: MapPin, label: "Indirizzi e location" },
    { key: "show_dress_code", icon: Shirt, label: "Dress code" },
    { key: "show_memories_qr", icon: QrCode, label: "QR fotocamera Memories" },
  ];

  const vendorToggles: { key: keyof typeof vendorsDefaults; icon: any; label: string }[] = [
    { key: "show_timeline", icon: Calendar, label: "Timeline operativa dettagliata" },
    { key: "show_addresses", icon: MapPin, label: "Indirizzi e note logistiche" },
    { key: "show_vendor_contacts", icon: Phone, label: "Contatti chiave" },
    { key: "show_operational_numbers", icon: Hash, label: "Numeri operativi (ospiti, tavoli, esigenze)" },
  ];

  const renderNewForm = () => {
    const toggles = audience === "guests" ? guestToggles : vendorToggles;
    return (
      <Card className="p-4 space-y-4 border-dashed">
        <div className="space-y-2">
          <Label className="text-sm">Etichetta (opzionale)</Label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={audience === "guests" ? "Es: Famiglia Rossi" : "Es: Fotografo, Catering"}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Cosa mostrare</Label>
          <div className="grid gap-2">
            {toggles.map(({ key, icon: Icon, label }) => (
              <div key={key} className="flex items-center justify-between p-2.5 rounded-md bg-muted/40">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {label}
                </div>
                <Switch
                  checked={!!newSettings[key]}
                  onCheckedChange={(v) => setNewSettings((s) => ({ ...s, [key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowForm(false)}>Annulla</Button>
          <Button onClick={createLink} disabled={loading}>
            {loading ? "Creazione..." : "Crea link"}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Condividi il tuo matrimonio
          </DialogTitle>
          <DialogDescription>
            Crea link pubblici dedicati per parenti e amici oppure per i fornitori del giorno dell'evento.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={audience} onValueChange={(v) => setAudience(v as Audience)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guests" className="gap-2"><Users className="w-4 h-4" /> Ospiti</TabsTrigger>
            <TabsTrigger value="vendors" className="gap-2"><Wrench className="w-4 h-4" /> Fornitori</TabsTrigger>
          </TabsList>

          <TabsContent value="guests" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Condividi con parenti e amici il conto alla rovescia, il programma della giornata, le informazioni pratiche e il QR per scattare foto con la fotocamera Memories.
            </p>
            {guestTokens.map(renderTokenCard)}
            {showForm && audience === "guests" ? (
              renderNewForm()
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuovo link Ospiti
              </Button>
            )}
          </TabsContent>

          <TabsContent value="vendors" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Condividi con i fornitori tutti i dettagli operativi del giorno: orari, indirizzi, contatti e numeri chiave.
            </p>
            {vendorTokens.map(renderTokenCard)}
            {showForm && audience === "vendors" ? (
              renderNewForm()
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuovo link Fornitori
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
