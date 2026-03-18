import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Trash2, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convertToJpeg } from "@/lib/imageConvert";

interface PhotoLightboxProps {
  photos: any[];
  currentIndex: number;
  supabaseUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (photoId: string) => void;
}

export default function PhotoLightbox({
  photos,
  currentIndex,
  supabaseUrl,
  open,
  onOpenChange,
  onDelete,
}: PhotoLightboxProps) {
  const [index, setIndex] = useState(currentIndex);
  const [downloading, setDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const photo = photos[index];
  if (!photo) return null;

  const photoUrl = `${supabaseUrl}/storage/v1/object/public/camera-photos/${photo.file_path}`;

  const formatFilename = (p: any) => {
    const name = (p.guest_name || "foto").replace(/\s+/g, "-");
    const ts = format(new Date(p.created_at), "dd-MM-yyyy_HH-mm", { locale: it });
    return `${name}_${ts}.jpg`;
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(photoUrl);
      const rawBlob = await res.blob();
      const jpegBlob = await convertToJpeg(rawBlob);
      const filename = formatFilename(photo);

      // Try native share on mobile first
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        try {
          const file = new File([jpegBlob], filename, { type: "image/jpeg" });
          await navigator.share({ files: [file] });
          return;
        } catch {
          // User cancelled or share not supported for files — fall through to download
        }
      }

      const a = document.createElement("a");
      a.href = URL.createObjectURL(jpegBlob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Errore durante il download");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await supabase.storage.from("camera-photos").remove([photo.file_path]);
      await supabase.from("camera_photos" as any).delete().eq("id", photo.id);
      onDelete?.(photo.id);
      toast.success("Foto eliminata");

      if (photos.length <= 1) {
        onOpenChange(false);
      } else if (index >= photos.length - 1) {
        setIndex(index - 1);
      }
    } catch {
      toast.error("Errore durante l'eliminazione");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(photos.length - 1, i + 1));

  const timestamp = format(new Date(photo.created_at), "d MMM yyyy, HH:mm", { locale: it });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-full p-0 gap-0 bg-black/95 border-none [&>button]:hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between p-3 text-white/80">
            <div className="text-sm">
              <span className="font-medium text-white">{photo.guest_name || "Anonimo"}</span>
              <span className="mx-2">·</span>
              <span>{timestamp}</span>
              <span className="mx-2">·</span>
              <span>{index + 1} / {photos.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-300 hover:bg-white/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => onOpenChange(false)}
              >
                <X size={18} />
              </Button>
            </div>
          </div>

          {/* Image area */}
          <div className="relative flex items-center justify-center min-h-[60vh] max-h-[80vh] px-12">
            {index > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 text-white/60 hover:text-white hover:bg-white/10 z-10"
                onClick={goPrev}
              >
                <ChevronLeft size={28} />
              </Button>
            )}

            <img
              src={photoUrl}
              alt={photo.guest_name || "Foto"}
              className="max-h-[75vh] max-w-full object-contain rounded"
            />

            {index < photos.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 text-white/60 hover:text-white hover:bg-white/10 z-10"
                onClick={goNext}
              >
                <ChevronRight size={28} />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. La foto verrà rimossa definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
