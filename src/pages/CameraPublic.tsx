import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import InAppBrowserGuard from "@/components/memories/InAppBrowserGuard";
import CameraViewfinder from "@/components/memories/CameraViewfinder";
import GuestNameSheet from "@/components/memories/GuestNameSheet";
import OfflineQueueBadge from "@/components/memories/OfflineQueueBadge";
import FilmFrame from "@/components/memories/FilmFrame";
import type { FilmType } from "@/lib/cameraFilters";
import {
  enqueue,
  getPendingCount,
  flushQueue,
  setupOfflineHandlers,
  type QueuedPhoto,
} from "@/lib/offlinePhotoQueue";
import { Camera, Mail } from "lucide-react";

type ViewMode = "camera" | "gallery";

// Simple browser fingerprint
function generateFingerprint(): string {
  const nav = navigator;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(36);
}

export default function CameraPublic() {
  const { token } = useParams<{ token: string }>();
  const [camera, setCamera] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("camera");
  const [shotsRemaining, setShotsRemaining] = useState(27);
  const [showNameSheet, setShowNameSheet] = useState(false);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [photos, setPhotos] = useState<any[]>([]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [filmFull, setFilmFull] = useState(false);
  const [shotsExhausted, setShotsExhausted] = useState(false);

  const fingerprint = useRef(generateFingerprint());
  const firstShot = useRef(true);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  // Load camera config
  useEffect(() => {
    if (!token) {
      setError("Token mancante");
      setLoading(false);
      return;
    }

    const load = async () => {
      // We use the edge function approach — but for reading camera config,
      // we need a public way. Let's just call the supabase REST API with anon key.
      const { data, error: err } = await supabase
        .from("disposable_cameras" as any)
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (err || !data) {
        setError("Rullino non trovato");
        setLoading(false);
        return;
      }

      const cam = data as any;

      if (!cam.is_active) {
        setError("Questo rullino non è più attivo");
        setLoading(false);
        return;
      }

      if (cam.ending_date && new Date(cam.ending_date) < new Date()) {
        setError("Questo rullino è scaduto");
        setLoading(false);
        return;
      }

      setCamera(cam);
      setShotsRemaining(cam.shots_per_person);
      setLoading(false);
    };

    load();
  }, [token]);

  // Setup offline handlers
  useEffect(() => {
    const cleanup = setupOfflineHandlers(supabaseUrl, (count) => {
      if (count > 0) setPendingCount((p) => Math.max(0, p - count));
    });
    return cleanup;
  }, [supabaseUrl]);

  // Check pending count periodically
  useEffect(() => {
    const check = async () => {
      const c = await getPendingCount();
      setPendingCount(c);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load gallery photos
  const loadGallery = useCallback(async () => {
    if (!camera) return;
    const { data } = await supabase
      .from("camera_photos" as any)
      .select("*")
      .eq("camera_id", camera.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    if (data) setPhotos(data as any[]);
  }, [camera]);

  useEffect(() => {
    if (view === "gallery") loadGallery();
  }, [view, loadGallery]);

  const handlePhotoTaken = useCallback(
    async (blob: Blob) => {
      if (!camera || !token) return;

      // Show name sheet after first shot
      if (firstShot.current && !guestName) {
        firstShot.current = false;
        setShowNameSheet(true);
      }

      // If offline, queue it
      if (!navigator.onLine) {
        const queued: QueuedPhoto = {
          id: crypto.randomUUID(),
          blob,
          token,
          fingerprint: fingerprint.current,
          guestName,
          filmType: camera.film_type || "vintage",
          timestamp: Date.now(),
        };
        await enqueue(queued);
        setPendingCount((p) => p + 1);
        setShotsRemaining((p) => Math.max(0, p - 1));
        return;
      }

      // Upload directly
      const formData = new FormData();
      formData.append("token", token);
      formData.append("fingerprint", fingerprint.current);
      formData.append("photo", blob, "photo.webp");
      if (guestName) formData.append("guest_name", guestName);
      if (camera.film_type) formData.append("film_type", camera.film_type);

      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/upload-camera-photo`,
          { method: "POST", body: formData }
        );
        const data = await res.json();

        if (data.error === "film_full") {
          setFilmFull(true);
          return;
        }
        if (data.error === "shots_exhausted") {
          setShotsExhausted(true);
          setShotsRemaining(0);
          return;
        }
        if (data.success) {
          setShotsRemaining(data.shots_remaining);
          if (data.shots_remaining <= 0) setShotsExhausted(true);
        }
      } catch {
        // Offline fallback
        const queued: QueuedPhoto = {
          id: crypto.randomUUID(),
          blob,
          token,
          fingerprint: fingerprint.current,
          guestName,
          filmType: camera.film_type || "vintage",
          timestamp: Date.now(),
        };
        await enqueue(queued);
        setPendingCount((p) => p + 1);
        setShotsRemaining((p) => Math.max(0, p - 1));
      }
    },
    [camera, token, guestName, supabaseUrl]
  );

  const handleNameSubmit = (name: string) => {
    setGuestName(name);
    setShowNameSheet(false);
  };

  const handleSaveEmail = async () => {
    if (!camera || !notifyEmail.trim()) return;
    try {
      await supabase
        .from("camera_participants" as any)
        .update({ notify_email: notifyEmail.trim() })
        .eq("camera_id", camera.id)
        .eq("guest_fingerprint", fingerprint.current);
      setEmailSaved(true);
    } catch {
      // silent
    }
  };

  const cameraUrl = typeof window !== "undefined" ? window.location.href : "";

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white/60 text-sm animate-pulse">Caricamento rullino...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">🎞️</div>
        <h1 className="text-white text-xl font-bold mb-2">{error}</h1>
      </div>
    );
  }

  // Film full state
  if (filmFull) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🎞️</div>
        <h1 className="text-white text-2xl font-bold mb-3">
          Avete esaurito tutta la pellicola!
        </h1>
        <p className="text-white/60 text-sm max-w-xs">
          Il rullino è pieno, godetevi la festa e aspettate di vedere lo sviluppo domani!
        </p>
      </div>
    );
  }

  // Shots exhausted state
  if (shotsExhausted) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">📸</div>
        <h1 className="text-white text-2xl font-bold mb-3">
          Hai finito il tuo rullino!
        </h1>
        <p className="text-white/60 text-sm mb-6 max-w-xs">
          Lascia la tua email per sapere quando le foto saranno sviluppate.
        </p>
        {!emailSaved ? (
          <div className="flex gap-2 w-full max-w-xs">
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="La tua email"
              className="flex-1 bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none"
            />
            <button
              onClick={handleSaveEmail}
              className="bg-white text-black font-semibold px-4 py-3 rounded-lg text-sm"
            >
              <Mail size={16} />
            </button>
          </div>
        ) : (
          <p className="text-green-400 text-sm">✓ Ti avviseremo!</p>
        )}
        <button
          onClick={() => setView("gallery")}
          className="text-white/50 text-sm mt-6 underline"
        >
          Vedi le foto scattate
        </button>
      </div>
    );
  }

  return (
    <InAppBrowserGuard cameraUrl={cameraUrl}>
      <div className="fixed inset-0 bg-black flex flex-col">
        <OfflineQueueBadge count={pendingCount} />

        {/* Tab switcher */}
        <div className="flex bg-zinc-900 border-b border-zinc-800">
          <button
            onClick={() => setView("camera")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              view === "camera" ? "text-white border-b-2 border-white" : "text-white/40"
            }`}
          >
            <Camera size={16} className="inline mr-1.5" />
            Scatta
          </button>
          <button
            onClick={() => setView("gallery")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              view === "gallery" ? "text-white border-b-2 border-white" : "text-white/40"
            }`}
          >
            🎞️ Galleria
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {view === "camera" ? (
            <CameraViewfinder
              filmType={(camera?.film_type as FilmType) || "vintage"}
              shotsRemaining={shotsRemaining}
              shotsTotal={camera?.shots_per_person || 27}
              onPhotoTaken={handlePhotoTaken}
              disabled={filmFull || shotsExhausted}
            />
          ) : (
            <div className="h-full overflow-y-auto p-3">
              {photos.length === 0 ? (
                <div className="text-center text-white/40 text-sm mt-20">
                  Nessuna foto ancora
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((p: any) => (
                    <FilmFrame
                      key={p.id}
                      src={`${supabaseUrl}/storage/v1/object/public/camera-photos/${p.file_path}`}
                      guestName={p.guest_name}
                      timestamp={p.created_at}
                    />
                  ))}
                </div>
              )}
              {/* Branding footer */}
              <p className="text-center text-white/20 text-[10px] mt-8 pb-4">
                Rullino offerto da MatrimonoStress
              </p>
            </div>
          )}
        </div>

        {/* Name sheet */}
        <GuestNameSheet
          open={showNameSheet}
          onSubmit={handleNameSubmit}
          onSkip={() => {
            setGuestName("Anonimo");
            setShowNameSheet(false);
          }}
        />
      </div>
    </InAppBrowserGuard>
  );
}
