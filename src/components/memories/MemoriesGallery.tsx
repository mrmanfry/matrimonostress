import FilmFrame from "@/components/memories/FilmFrame";
import PhotoLightbox from "@/components/memories/PhotoLightbox";
import { Lock, Unlock, Loader2, CheckSquare, Square, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface MemoriesGalleryProps {
  photos: any[];
  camera: any;
  supabaseUrl: string;
  weddingId?: string;
  onUnlocked?: () => void;
  onDeletePhoto?: (photoId: string) => void;
}

export default function MemoriesGallery({
  photos,
  camera,
  supabaseUrl,
  weddingId,
  onUnlocked,
  onDeletePhoto,
}: MemoriesGalleryProps) {
  const approvedPhotos = photos.filter((p) => p.is_approved);
  const freeLimit = camera?.free_reveal_limit || 100;
  const unlocked = camera?.photos_unlocked || false;
  const [unlocking, setUnlocking] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const unlockedPhotos = approvedPhotos.filter((_, idx) => unlocked || idx < freeLimit);

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
    } catch {
      toast.error("Errore durante l'avvio del pagamento");
    } finally {
      setUnlocking(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(unlockedPhotos.map((p) => p.id)));
  };

  const deselectAll = () => setSelected(new Set());

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const formatFilename = (p: any) => {
    const name = (p.guest_name || "foto").replace(/\s+/g, "-");
    const ts = format(new Date(p.created_at), "dd-MM-yyyy_HH-mm", { locale: it });
    return `${name}_${ts}.webp`;
  };

  const downloadSelected = useCallback(async () => {
    if (selected.size === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const selectedPhotos = unlockedPhotos.filter((p) => selected.has(p.id));

      for (const photo of selectedPhotos) {
        const url = `${supabaseUrl}/storage/v1/object/public/camera-photos/${photo.file_path}`;
        const res = await fetch(url);
        const blob = await res.blob();
        zip.file(formatFilename(photo), blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "memories-reel.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success(`${selectedPhotos.length} foto scaricate`);
    } catch {
      toast.error("Errore durante la creazione dello ZIP");
    } finally {
      setZipping(false);
    }
  }, [selected, unlockedPhotos, supabaseUrl]);

  const handlePhotoClick = (idx: number) => {
    const photo = approvedPhotos[idx];
    const isLocked = !unlocked && idx >= freeLimit;
    if (isLocked) return;

    if (selectMode) {
      toggleSelect(photo.id);
    } else {
      // Map to unlocked photos index for lightbox
      const unlockedIdx = unlockedPhotos.findIndex((p) => p.id === photo.id);
      if (unlockedIdx >= 0) setLightboxIndex(unlockedIdx);
    }
  };

  const handleDeleteFromLightbox = (photoId: string) => {
    onDeletePhoto?.(photoId);
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
      {/* Toolbar */}
      {unlockedPhotos.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!selectMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectMode(true)}
                className="gap-1.5"
              >
                <CheckSquare size={14} />
                Seleziona
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={exitSelectMode} className="gap-1.5">
                  <X size={14} />
                  Annulla
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selected.size === unlockedPhotos.length ? deselectAll : selectAll}
                >
                  {selected.size === unlockedPhotos.length ? "Deseleziona tutto" : "Seleziona tutto"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selected.size} selezionate
                </span>
              </>
            )}
          </div>
          {selectMode && selected.size > 0 && (
            <Button size="sm" onClick={downloadSelected} disabled={zipping} className="gap-1.5">
              {zipping ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Scarica ({selected.size})
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {approvedPhotos.map((photo, idx) => {
          const isLocked = !unlocked && idx >= freeLimit;
          const isSelected = selected.has(photo.id);

          return (
            <div
              key={photo.id}
              className="relative cursor-pointer group"
              onClick={() => handlePhotoClick(idx)}
            >
              {isLocked ? (
                <div className="aspect-[3/4] rounded-lg bg-muted flex flex-col items-center justify-center">
                  <Lock size={24} className="text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Bloccata</p>
                </div>
              ) : (
                <>
                  <FilmFrame
                    src={`${supabaseUrl}/storage/v1/object/public/camera-photos/${photo.file_path}`}
                    guestName={photo.guest_name}
                    timestamp={photo.created_at}
                  />
                  {selectMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(photo.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/80 border-white/60"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA Sblocco — sempre visibile se non sbloccato */}
      {!unlocked && (
        <div className="text-center py-6 bg-muted/50 rounded-lg space-y-3">
          <Lock size={24} className="mx-auto text-muted-foreground" />
          <div>
            {lockedCount > 0 ? (
              <>
                <p className="text-sm font-semibold">
                  {lockedCount} foto bloccate
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sblocca tutte le foto per vederle e scaricarle in alta risoluzione
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">
                  Sblocca il tuo album
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sblocca ora per garantire che le foto non vengano eliminate dopo 30 giorni
                </p>
              </>
            )}
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

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={unlockedPhotos}
          currentIndex={lightboxIndex}
          supabaseUrl={supabaseUrl}
          open={true}
          onOpenChange={(open) => {
            if (!open) setLightboxIndex(null);
          }}
          onDelete={handleDeleteFromLightbox}
        />
      )}
    </div>
  );
}
