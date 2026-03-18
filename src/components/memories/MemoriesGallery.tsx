import FilmFrame from "@/components/memories/FilmFrame";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface MemoriesGalleryProps {
  photos: any[];
  camera: any;
  supabaseUrl: string;
  weddingId?: string;
  onUnlocked?: () => void;
}

export default function MemoriesGallery({ photos, camera, supabaseUrl, weddingId, onUnlocked }: MemoriesGalleryProps) {
  const approvedPhotos = photos.filter((p) => p.is_approved);
  const freeLimit = camera?.free_reveal_limit || 100;
  const unlocked = camera?.photos_unlocked || false;
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async () => {
    if (!weddingId) return;
    setUnlocking(true);
    try {
      const { data, error } = await supabase.functions.invoke("unlock-photos", {
        body: { weddingId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      toast.error("Errore durante l'avvio del pagamento");
      console.error(err);
    } finally {
      setUnlocking(false);
    }
  };

  if (approvedPhotos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📷</div>
        <h3 className="text-lg font-semibold mb-1">Nessuna foto ancora</h3>
        <p className="text-muted-foreground text-sm">
          Condividi il QR code con i tuoi ospiti per iniziare!
        </p>
      </div>
    );
  }

  const lockedCount = !unlocked ? Math.max(0, approvedPhotos.length - freeLimit) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {approvedPhotos.map((photo, idx) => {
          const isLocked = !unlocked && idx >= freeLimit;

          return (
            <div key={photo.id} className="relative">
              {isLocked ? (
                <div className="aspect-[3/4] rounded-lg bg-muted flex flex-col items-center justify-center">
                  <Lock size={24} className="text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Bloccata</p>
                </div>
              ) : (
                <FilmFrame
                  src={`${supabaseUrl}/storage/v1/object/public/camera-photos/${photo.file_path}`}
                  guestName={photo.guest_name}
                  timestamp={photo.created_at}
                />
              )}
            </div>
          );
        })}
      </div>

      {!unlocked && lockedCount > 0 && (
        <div className="text-center py-6 bg-muted/50 rounded-lg space-y-3">
          <Lock size={24} className="mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">
              {lockedCount} foto bloccate
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sblocca tutte le foto per vederle e scaricarle in alta risoluzione
            </p>
          </div>
          <Button onClick={handleUnlock} disabled={unlocking} className="gap-2">
            {unlocking ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Unlock size={16} />
            )}
            Sblocca Album — €15
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Pagamento sicuro con Stripe. Le foto non sbloccate verranno eliminate dopo 30 giorni.
          </p>
        </div>
      )}

      {unlocked && (
        <div className="text-center py-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-primary flex items-center justify-center gap-2">
            <Unlock size={14} />
            Album sbloccato — tutte le foto sono disponibili
          </p>
        </div>
      )}
    </div>
  );
}
