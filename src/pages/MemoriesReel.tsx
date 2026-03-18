import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MemoriesKPIs from "@/components/memories/MemoriesKPIs";
import MemoriesSettings from "@/components/memories/MemoriesSettings";
import MemoriesGallery from "@/components/memories/MemoriesGallery";
import ModerationView from "@/components/memories/ModerationView";
import ShareCameraDialog from "@/components/memories/ShareCameraDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Share2, Settings, Image, ShieldCheck } from "lucide-react";

export default function MemoriesReel() {
  const { weddingId } = useAuth();
  const [camera, setCamera] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  const loadData = useCallback(async () => {
    if (!weddingId) return;

    // Load or create camera
    let { data: cam } = await supabase
      .from("disposable_cameras" as any)
      .select("*")
      .eq("wedding_id", weddingId)
      .maybeSingle();

    if (!cam) {
      // Auto-create camera on first visit
      const { data: newCam } = await supabase
        .from("disposable_cameras" as any)
        .insert({ wedding_id: weddingId })
        .select()
        .single();
      cam = newCam;
    }

    setCamera(cam);

    if (cam) {
      const [photosRes, participantsRes] = await Promise.all([
        supabase
          .from("camera_photos" as any)
          .select("*")
          .eq("camera_id", (cam as any).id)
          .order("created_at", { ascending: false }),
        supabase
          .from("camera_participants" as any)
          .select("*")
          .eq("camera_id", (cam as any).id),
      ]);

      setPhotos((photosRes.data as any[]) || []);
      setParticipants((participantsRes.data as any[]) || []);
    }

    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettingsUpdate = async (updates: any) => {
    if (!camera) return;
    await supabase
      .from("disposable_cameras" as any)
      .update(updates)
      .eq("id", camera.id);
    setCamera({ ...camera, ...updates });
  };

  const handleApprovePhoto = async (photoId: string) => {
    await supabase
      .from("camera_photos" as any)
      .update({ is_approved: true })
      .eq("id", photoId);
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, is_approved: true } : p))
    );
  };

  const handleRejectPhoto = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (photo) {
      await supabase.storage.from("camera-photos").remove([photo.file_path]);
    }
    await supabase.from("camera_photos" as any).delete().eq("id", photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm animate-pulse">
          Caricamento Memories Reel...
        </p>
      </div>
    );
  }

  const pendingApproval = photos.filter((p) => !p.is_approved);
  const cameraUrl = camera
    ? `${window.location.origin}/camera/${camera.token}`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Memories Reel</h1>
          <p className="text-muted-foreground text-sm">
            Il rullino digitale usa e getta per i tuoi ospiti
          </p>
        </div>
        <Button onClick={() => setShowShare(true)} className="gap-2">
          <Share2 size={16} />
          Condividi QR
        </Button>
      </div>

      <MemoriesKPIs
        totalPhotos={photos.length}
        totalParticipants={participants.length}
        hardLimit={camera?.hard_storage_limit || 500}
        pendingApproval={pendingApproval.length}
        requireApproval={camera?.require_approval || false}
      />

      <Tabs defaultValue="gallery">
        <TabsList>
          <TabsTrigger value="gallery" className="gap-1.5">
            <Image size={14} />
            Galleria
          </TabsTrigger>
          {camera?.require_approval && pendingApproval.length > 0 && (
            <TabsTrigger value="moderation" className="gap-1.5">
              <ShieldCheck size={14} />
              Moderazione ({pendingApproval.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings size={14} />
            Impostazioni
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery">
          <MemoriesGallery
            photos={photos}
            camera={camera}
            supabaseUrl={supabaseUrl}
          />
        </TabsContent>

        {camera?.require_approval && (
          <TabsContent value="moderation">
            <ModerationView
              photos={pendingApproval}
              supabaseUrl={supabaseUrl}
              onApprove={handleApprovePhoto}
              onReject={handleRejectPhoto}
            />
          </TabsContent>
        )}

        <TabsContent value="settings">
          <MemoriesSettings
            camera={camera}
            onUpdate={handleSettingsUpdate}
          />
        </TabsContent>
      </Tabs>

      <ShareCameraDialog
        open={showShare}
        onOpenChange={setShowShare}
        cameraUrl={cameraUrl}
      />
    </div>
  );
}
