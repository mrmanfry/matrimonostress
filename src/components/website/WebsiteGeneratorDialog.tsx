import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildLovableUrl, type WeddingPromptData } from "@/lib/generateLovableUrl";

interface Props {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WebsiteGeneratorDialog = ({ weddingId, open, onOpenChange }: Props) => {
  const [weddingData, setWeddingData] = useState<WeddingPromptData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("weddings")
      .select("partner1_name, partner2_name, wedding_date, ceremony_venue_name, ceremony_venue_address, reception_venue_name, reception_venue_address")
      .eq("id", weddingId)
      .single()
      .then(({ data }) => {
        if (data) {
          setWeddingData({ ...data, wedding_id: weddingId });
        }
        setLoading(false);
      });
  }, [open, weddingId]);

  const handleProceed = () => {
    if (!weddingData) return;
    const url = buildLovableUrl(weddingData);
    window.open(url, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stiamo preparando la magia ✨</DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <span className="block">
              Stiamo per collegarti al nostro partner AI (Lovable) per generare il tuo sito.
              Abbiamo già preparato le istruzioni con i dati del tuo matrimonio!
            </span>
            <span className="block text-sm font-medium text-foreground">⚠️ Importante:</span>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Verrai reindirizzato su un'altra pagina.</li>
              <li>Se non hai un account su Lovable, ti verrà chiesto di crearne uno gratuito per salvare e pubblicare il sito.</li>
              <li>Il bottone RSVP sul nuovo sito sarà già collegato magicamente a Nozze Senza Stress!</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleProceed} disabled={loading || !weddingData}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            Ho capito, andiamo!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WebsiteGeneratorDialog;
