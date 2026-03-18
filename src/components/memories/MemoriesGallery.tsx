import FilmFrame from "@/components/memories/FilmFrame";
import { Lock } from "lucide-react";

interface MemoriesGalleryProps {
  photos: any[];
  camera: any;
  supabaseUrl: string;
}

export default function MemoriesGallery({ photos, camera, supabaseUrl }: MemoriesGalleryProps) {
  const approvedPhotos = photos.filter((p) => p.is_approved);
  const freeLimit = camera?.free_reveal_limit || 100;
  const unlocked = camera?.photos_unlocked || false;

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

      {!unlocked && approvedPhotos.length > freeLimit && (
        <div className="text-center py-4 bg-muted/50 rounded-lg">
          <Lock size={20} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">
            {approvedPhotos.length - freeLimit} foto bloccate
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sblocca tutte le foto per vederle e scaricarle in alta risoluzione
          </p>
        </div>
      )}
    </div>
  );
}
