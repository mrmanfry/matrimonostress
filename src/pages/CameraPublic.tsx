import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import InAppBrowserGuard from "@/components/memories/InAppBrowserGuard";
import CameraViewfinder, { type CameraViewfinderHandle } from "@/components/memories/CameraViewfinder";
import GuestNameSheet from "@/components/memories/GuestNameSheet";
import OfflineQueueBadge from "@/components/memories/OfflineQueueBadge";
import FilmFrame from "@/components/memories/FilmFrame";
import type { FilmType } from "@/lib/cameraFilters";
import {
  enqueue,
  getPendingCount,
  setupOfflineHandlers,
  type QueuedPhoto,
} from "@/lib/offlinePhotoQueue";
import { Camera, Images, Mail } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type ViewMode = "camera" | "gallery";

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

const GOLD = "#C9A96E";

export default function CameraPublic() {
  const { token } = useParams<{ token: string }>();
  const [camera, setCamera] = useState<any>(null);
  const [wedding, setWedding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("camera");
  const [shotsRemaining, setShotsRemaining] = useState(27);
  const [showNameSheet, setShowNameSheet] = useState(false);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [photos, setPhotos] = useState<any[]>([]);
  const pendingBlobRef = useRef<Blob | null>(null);
  const viewfinderRef = useRef<CameraViewfinderHandle>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [filmFull, setFilmFull] = useState(false);
  const [shotsExhausted, setShotsExhausted] = useState(false);

  const fingerprint = useRef(generateFingerprint());
  const firstShot = useRef(true);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  // Persist guest name in localStorage per token
  useEffect(() => {
    if (!token) return;
    const saved = localStorage.getItem(`camera_guest_name_${token}`);
    if (saved !== null) {
      setGuestName(saved || null);
      firstShot.current = false;
    }
  }, [token]);

  // Load camera config + wedding info
  useEffect(() => {
    if (!token) {
      setError("Token mancante");
      setLoading(false);
      return;
    }

    const load = async () => {
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

      // Load wedding info
      const { data: wed } = await supabase
        .from("weddings")
        .select("partner1_name, partner2_name, wedding_date")
        .eq("id", cam.wedding_id)
        .maybeSingle();

      if (wed) setWedding(wed);

      // Load participant count
      const { count } = await supabase
        .from("camera_participants" as any)
        .select("*", { count: "exact", head: true })
        .eq("camera_id", cam.id);

      setParticipantCount(count || 0);
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
      .eq("guest_fingerprint", fingerprint.current)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    if (data) setPhotos(data as any[]);
  }, [camera]);

  useEffect(() => {
    if (view === "gallery") loadGallery();
  }, [view, loadGallery]);

  const uploadPhoto = useCallback(
    async (blob: Blob, name: string | null) => {
      if (!camera || !token) return;

      if (!navigator.onLine) {
        const queued: QueuedPhoto = {
          id: crypto.randomUUID(),
          blob,
          token,
          fingerprint: fingerprint.current,
          guestName: name,
          filmType: camera.film_type || "vintage",
          timestamp: Date.now(),
        };
        await enqueue(queued);
        setPendingCount((p) => p + 1);
        setShotsRemaining((p) => Math.max(0, p - 1));
        return;
      }

      const formData = new FormData();
      formData.append("token", token);
      formData.append("fingerprint", fingerprint.current);
      const { ext } = await import("@/lib/cameraFilters").then(m => ({ ext: m.getOutputFormat().ext }));
      formData.append("photo", blob, `photo.${ext}`);
      if (name) formData.append("guest_name", name);
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
        const queued: QueuedPhoto = {
          id: crypto.randomUUID(),
          blob,
          token,
          fingerprint: fingerprint.current,
          guestName: name,
          filmType: camera.film_type || "vintage",
          timestamp: Date.now(),
        };
        await enqueue(queued);
        setPendingCount((p) => p + 1);
        setShotsRemaining((p) => Math.max(0, p - 1));
      }
    },
    [camera, token, supabaseUrl]
  );

  const handlePhotoTaken = useCallback(
    async (blob: Blob) => {
      if (!camera || !token) return;

      // First shot: ask name before uploading
      if (firstShot.current && !guestName) {
        firstShot.current = false;
        pendingBlobRef.current = blob;
        setShowNameSheet(true);
        return;
      }

      await uploadPhoto(blob, guestName);
    },
    [camera, token, guestName, uploadPhoto]
  );

  const handleNameSubmit = useCallback((name: string) => {
    setGuestName(name);
    setShowNameSheet(false);
    if (token) localStorage.setItem(`camera_guest_name_${token}`, name);
    if (pendingBlobRef.current) {
      uploadPhoto(pendingBlobRef.current, name);
      pendingBlobRef.current = null;
    }
    // Delay restart to let viewport recover after keyboard dismissal
    setTimeout(() => {
      viewfinderRef.current?.restartCamera();
    }, 350);
  }, [uploadPhoto, token]);

  const handleNameSkip = useCallback(() => {
    setGuestName("Anonimo");
    setShowNameSheet(false);
    if (token) localStorage.setItem(`camera_guest_name_${token}`, "Anonimo");
    if (pendingBlobRef.current) {
      uploadPhoto(pendingBlobRef.current, "Anonimo");
      pendingBlobRef.current = null;
    }
    setTimeout(() => {
      viewfinderRef.current?.restartCamera();
    }, 350);
  }, [uploadPhoto, token]);

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

  const shotsTaken = camera ? camera.shots_per_person - shotsRemaining : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#1A1A1A" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent ${GOLD} transparent` }} />
          <p className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>Caricamento rullino...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ background: "#1A1A1A" }}>
        <div className="text-5xl mb-4">🎞️</div>
        <h1 className="text-xl font-bold mb-2 text-white">{error}</h1>
      </div>
    );
  }

  // Film full state
  if (filmFull) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ background: "#1A1A1A" }}>
        <div className="text-6xl mb-4">🎞️</div>
        <h1 className="text-2xl font-bold mb-3 text-white">Pellicola esaurita!</h1>
        <p className="text-sm max-w-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          Il rullino è pieno, godetevi la festa!
        </p>
      </div>
    );
  }

  // Shots exhausted state
  if (shotsExhausted) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ background: "#1A1A1A" }}>
        <div className="text-6xl mb-4">📸</div>
        <h1 className="text-2xl font-bold mb-3 text-white">Hai finito i tuoi scatti!</h1>
        <p className="text-sm mb-6 max-w-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          Lascia la tua email per sapere quando le foto saranno sviluppate.
        </p>
        {!emailSaved ? (
          <div className="flex gap-2 w-full max-w-xs">
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="La tua email"
              className="flex-1 rounded-lg px-4 py-3 text-sm border focus:outline-none text-white"
              style={{ background: "#2A2A2A", borderColor: "#3A3A3A" }}
            />
            <button
              onClick={handleSaveEmail}
              className="font-semibold px-4 py-3 rounded-lg text-sm"
              style={{ background: GOLD, color: "#1A1A1A" }}
            >
              <Mail size={16} />
            </button>
          </div>
        ) : (
          <p className="text-sm" style={{ color: GOLD }}>✓ Ti avviseremo!</p>
        )}
        <button
          onClick={() => { setShotsExhausted(false); setView("gallery"); }}
          className="text-sm mt-6 underline"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Vedi le tue foto
        </button>
      </div>
    );
  }

  return (
    <InAppBrowserGuard cameraUrl={cameraUrl}>
      <div className="fixed inset-0 flex flex-col" style={{ background: "#1A1A1A" }}>
        <OfflineQueueBadge count={pendingCount} />

        {/* Hero Header */}
        <div className="px-5 pt-6 pb-4">
          <p className="text-xs font-mono tracking-[0.3em] uppercase mb-1" style={{ color: GOLD }}>
            Memories Reel
          </p>
          {wedding && (
            <h1 className="text-xl font-bold text-white tracking-tight">
              {wedding.partner1_name} & {wedding.partner2_name}
            </h1>
          )}
          {wedding?.wedding_date && (
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {format(new Date(wedding.wedding_date), "d MMMM yyyy", { locale: it })}
            </p>
          )}
        </div>

        {/* KPI Bar */}
        <div className="flex items-center gap-1 px-5 pb-4">
          <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ background: "#2A2A2A" }}>
            <p className="text-lg font-bold text-white">{shotsTaken}/{camera?.shots_per_person || 27}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>Scatti</p>
          </div>
          <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ background: "#2A2A2A" }}>
            <p className="text-lg font-bold text-white">{participantCount}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>Ospiti</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {view === "camera" ? (
            <CameraViewfinder
              ref={viewfinderRef}
              filmType={(camera?.film_type as FilmType) || "vintage"}
              shotsRemaining={shotsRemaining}
              shotsTotal={camera?.shots_per_person || 27}
              onPhotoTaken={handlePhotoTaken}
              disabled={filmFull || shotsExhausted}
            />
          ) : (
            <div className="h-full overflow-y-auto px-3 pb-4">
              {/* Gallery header */}
              <div className="flex items-center justify-between py-3">
                <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {photos.length} foto · {shotsRemaining} scatti rimanenti
                </p>
              </div>
              {photos.length === 0 ? (
                <div className="text-center mt-20">
                  <div className="text-4xl mb-3">🎞️</div>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Nessuna foto ancora — scatta la prima!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
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
              <p className="text-center text-[10px] mt-8 pb-4" style={{ color: "rgba(255,255,255,0.15)" }}>
                Rullino offerto da MatrimonoStress
              </p>
            </div>
          )}
        </div>

        {/* Bottom Nav — pill style */}
        <div className="shrink-0 px-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="flex gap-2 p-1 rounded-full" style={{ background: "#2A2A2A" }}>
            <button
              onClick={() => setView("camera")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all"
              style={{
                background: view === "camera" ? GOLD : "transparent",
                color: view === "camera" ? "#1A1A1A" : "rgba(255,255,255,0.5)",
              }}
            >
              <Camera size={16} />
              Scatta
            </button>
            <button
              onClick={() => setView("gallery")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all"
              style={{
                background: view === "gallery" ? GOLD : "transparent",
                color: view === "gallery" ? "#1A1A1A" : "rgba(255,255,255,0.5)",
              }}
            >
              <Images size={16} />
              Galleria
            </button>
          </div>
        </div>

        {/* Name sheet */}
        <GuestNameSheet
          open={showNameSheet}
          onSubmit={handleNameSubmit}
          onSkip={handleNameSkip}
        />
      </div>
    </InAppBrowserGuard>
  );
}
