import FilmFrame from "@/components/memories/FilmFrame";
import PhotoLightbox from "@/components/memories/PhotoLightbox";
import { Lock, Unlock, Loader2, CheckSquare, X, Download, Sparkles, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { convertToJpeg } from "@/lib/imageConvert";

interface MemoriesGalleryProps {
  photos: any[];
  camera: any;
  supabaseUrl: string;
  weddingId?: string;
  onUnlocked?: () => void;
  onDeletePhoto?: (photoId: string) => void;
}

const TIERS = [
  { key: "starter" as const, label: "Starter", photos: 500, price: 9, priceId: "price_1TCNy4FsI7It2TixwhlUeP4J" },
  { key: "plus" as const, label: "Plus", photos: 1500, price: 29, priceId: "price_1TCNytFsI7It2TixbYrGIhvS", popular: true },
  { key: "premium" as const, label: "Premium", photos: 2500, price: 49, priceId: "price_1TCNzDFsI7It2Tix8zLhwALu" },
];

const FREE_LIMIT = 150;

export default function MemoriesGallery({
  photos,
  camera,
  supabaseUrl,
  weddingId,
  onUnlocked,
  onDeletePhoto,
}: MemoriesGalleryProps) {
  const approvedPhotos = photos.filter((p) => p.is_approved);
  const unlockedLimit = camera?.unlocked_photo_limit || FREE_LIMIT;
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const tierSectionRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const visiblePhotos = approvedPhotos.slice(0, unlockedLimit);
  const lockedCount = Math.max(0, approvedPhotos.length - unlockedLimit);
  const hasUpgraded = unlockedLimit > FREE_LIMIT;

  // Find which tier is currently active
  const currentTierIdx = TIERS.findIndex((t) => t.photos === unlockedLimit);
  const canUpgrade = unlockedLimit < 2500;

  // Suggest the best tier based on total photos
  const suggestedTier = TIERS.find((t) => t.photos >= approvedPhotos.length) || TIERS[TIERS.length - 1];

  const scrollToUpgrade = () => {
    tierSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleUnlock = async (tierKey: string) => {
    if (!weddingId) return;
    setUnlocking(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("unlock-photos", {
        body: { weddingId, tier: tierKey },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast.error("Errore durante l'avvio del pagamento");
    } finally {
      setUnlocking(null);
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

  const selectAll = () => setSelected(new Set(visiblePhotos.map((p) => p.id)));
  const deselectAll = () => setSelected(new Set());
  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const formatFilename = (p: any) => {
    const name = (p.guest_name || "foto").replace(/\s+/g, "-");
    const ts = format(new Date(p.created_at), "dd-MM-yyyy_HH-mm", { locale: it });
    return `${name}_${ts}.jpg`;
  };

  const fetchAndConvert = async (photo: any): Promise<{ blob: Blob; filename: string }> => {
    const url = `${supabaseUrl}/storage/v1/object/public/camera-photos/${photo.file_path}`;
    const res = await fetch(url);
    const rawBlob = await res.blob();
    const jpegBlob = await convertToJpeg(rawBlob);
    return { blob: jpegBlob, filename: formatFilename(photo) };
  };

  const downloadSelected = useCallback(async () => {
    if (selected.size === 0) return;
    setZipping(true);
    try {
      const selectedPhotos = visiblePhotos.filter((p) => selected.has(p.id));

      // Mobile: try Web Share API first
      if (isMobile && navigator.share) {
        try {
          const files: File[] = [];
          for (const photo of selectedPhotos) {
            const { blob, filename } = await fetchAndConvert(photo);
            files.push(new File([blob], filename, { type: "image/jpeg" }));
          }
          await navigator.share({ files });
          toast.success(`${selectedPhotos.length} foto condivise`);
          return;
        } catch (e: any) {
          // User cancelled share or files not supported — fall through
          if (e?.name === "AbortError") return;
        }
      }

      // Mobile fallback: sequential JPEG downloads
      if (isMobile) {
        for (let i = 0; i < selectedPhotos.length; i++) {
          const { blob, filename } = await fetchAndConvert(selectedPhotos[i]);
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
          if (i < selectedPhotos.length - 1) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        toast.success(`${selectedPhotos.length} foto scaricate`);
        return;
      }

      // Desktop: ZIP with JPEG files
      const zip = new JSZip();
      for (const photo of selectedPhotos) {
        const { blob, filename } = await fetchAndConvert(photo);
        zip.file(filename, blob);
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
      toast.error("Errore durante il download");
    } finally {
      setZipping(false);
    }
  }, [selected, visiblePhotos, supabaseUrl, isMobile]);

  const handlePhotoClick = (idx: number) => {
    const photo = approvedPhotos[idx];
    const isLocked = idx >= unlockedLimit;
    if (isLocked) return;

    if (selectMode) {
      toggleSelect(photo.id);
    } else {
      const visibleIdx = visiblePhotos.findIndex((p) => p.id === photo.id);
      if (visibleIdx >= 0) setLightboxIndex(visibleIdx);
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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {visiblePhotos.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!selectMode ? (
              <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} className="gap-1.5">
                <CheckSquare size={14} />
                Seleziona
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={exitSelectMode} className="gap-1.5">
                  <X size={14} /> Annulla
                </Button>
                <Button variant="ghost" size="sm" onClick={selected.size === visiblePhotos.length ? deselectAll : selectAll}>
                  {selected.size === visiblePhotos.length ? "Deseleziona tutto" : "Seleziona tutto"}
                </Button>
                <span className="text-xs text-muted-foreground">{selected.size} selezionate</span>
              </>
            )}
          </div>
          {selectMode && selected.size > 0 && (
            <Button size="sm" onClick={downloadSelected} disabled={zipping} className="gap-1.5">
              {zipping ? <Loader2 size={14} className="animate-spin" /> : isMobile ? <Share2 size={14} /> : <Download size={14} />}
              {isMobile ? `Condividi (${selected.size})` : `Scarica (${selected.size})`}
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {approvedPhotos.map((photo, idx) => {
          const isLocked = idx >= unlockedLimit;
          const isSelected = selected.has(photo.id);

          return (
            <div key={photo.id} className="relative cursor-pointer group" onClick={() => handlePhotoClick(idx)}>
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

      {/* Current tier info */}
      {hasUpgraded && (
        <div className="text-center py-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-primary flex items-center justify-center gap-2">
            <Unlock size={14} />
            Piano {TIERS[currentTierIdx]?.label || "attivo"} — {unlockedLimit} foto sbloccate
            {canUpgrade && lockedCount > 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({lockedCount} ancora bloccate)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Tier upgrade CTA */}
      {canUpgrade && (
        <div ref={tierSectionRef} className="space-y-4 py-6">
          <div className="text-center space-y-1">
            <h3 className="text-base font-semibold flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-primary" />
              {hasUpgraded ? "Vuoi vedere più foto?" : "Sblocca le foto del tuo matrimonio"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {lockedCount > 0
                ? `Hai ${lockedCount} foto in più da sbloccare. Scegli il pacchetto giusto per te.`
                : "Scegli un pacchetto per garantire che le foto non vengano eliminate dopo 30 giorni."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TIERS.filter((t) => t.photos > unlockedLimit).map((tier) => {
              const isRecommended = tier.key === suggestedTier.key;
              return (
                <Card
                  key={tier.key}
                  className={`relative transition-shadow ${
                    isRecommended ? "border-primary shadow-md ring-1 ring-primary/20" : ""
                  }`}
                >
                  {isRecommended && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2">
                      Consigliato
                    </Badge>
                  )}
                  <CardContent className="p-4 text-center space-y-3">
                    <div>
                      <p className="text-sm font-semibold">{tier.label}</p>
                      <p className="text-xs text-muted-foreground">Fino a {tier.photos.toLocaleString("it-IT")} foto</p>
                    </div>
                    <p className="text-2xl font-bold">€{tier.price}</p>
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      variant={isRecommended ? "default" : "outline"}
                      onClick={() => handleUnlock(tier.key)}
                      disabled={unlocking !== null}
                    >
                      {unlocking === tier.key ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Unlock size={14} />
                      )}
                      {hasUpgraded ? "Upgrade" : "Sblocca"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            Pagamento sicuro con Stripe. Le foto oltre il tuo limite verranno eliminate dopo 30 giorni.
          </p>
        </div>
      )}

      {/* All unlocked */}
      {!canUpgrade && (
        <div className="text-center py-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-primary flex items-center justify-center gap-2">
            <Unlock size={14} />
            Piano Premium — tutte le foto sono disponibili
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={visiblePhotos}
          currentIndex={lightboxIndex}
          supabaseUrl={supabaseUrl}
          open={true}
          onOpenChange={(open) => { if (!open) setLightboxIndex(null); }}
          onDelete={handleDeleteFromLightbox}
        />
      )}
    </div>
  );
}
