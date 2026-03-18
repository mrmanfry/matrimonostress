import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ModerationViewProps {
  photos: any[];
  supabaseUrl: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ModerationView({
  photos,
  supabaseUrl,
  onApprove,
  onReject,
}: ModerationViewProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-lg font-semibold">Tutto approvato!</h3>
        <p className="text-muted-foreground text-sm">
          Non ci sono foto in attesa di moderazione.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="rounded-lg border bg-card overflow-hidden"
        >
          <div className="aspect-[3/4] overflow-hidden">
            <img
              src={`${supabaseUrl}/storage/v1/object/public/camera-photos/${photo.file_path}`}
              alt="Foto in attesa"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate">
              {photo.guest_name || "Anonimo"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onReject(photo.id)}
              >
                <X size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600"
                onClick={() => onApprove(photo.id)}
              >
                <Check size={16} />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
