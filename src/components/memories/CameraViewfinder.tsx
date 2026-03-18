import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { processPhoto, getCSSFilter, type FilmType } from "@/lib/cameraFilters";
import { RotateCcw } from "lucide-react";

const GOLD = "#C9A96E";

interface CameraViewfinderProps {
  filmType: FilmType;
  shotsRemaining: number;
  shotsTotal: number;
  onPhotoTaken: (blob: Blob) => void;
  disabled?: boolean;
}

export interface CameraViewfinderHandle {
  restartCamera: () => Promise<void>;
}

const CameraViewfinder = forwardRef<CameraViewfinderHandle, CameraViewfinderProps>(
  function CameraViewfinder(
    { filmType, shotsRemaining, shotsTotal, onPhotoTaken, disabled = false },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
    const [isCapturing, setIsCapturing] = useState(false);
    const [recovering, setRecovering] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const startCamera = useCallback(async (facing: "environment" | "user") => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        setCameraReady(false);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          // Force play — critical for iOS recovery after keyboard/sheet
          try { await video.play(); } catch { /* autoplay attr handles it */ }
        }
        setPermissionDenied(false);
      } catch (err: any) {
        console.error("Camera error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setPermissionDenied(true);
        }
        setCameraReady(false);
      }
    }, []);

    // Expose restartCamera for parent to call after name sheet closes
    useImperativeHandle(ref, () => ({
      restartCamera: async () => {
        console.log("[Camera] restartCamera called");
        setRecovering(true);
        await startCamera(facingMode);
        // Wait a tick for video to start producing frames
        await new Promise<void>((resolve) => {
          const video = videoRef.current;
          if (!video) { resolve(); return; }
          const check = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              setCameraReady(true);
              setRecovering(false);
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          };
          // Timeout safety — don't hang forever
          const timeout = setTimeout(() => { setRecovering(false); setCameraReady(true); resolve(); }, 3000);
          const wrapped = () => { clearTimeout(timeout); check(); };
          video.addEventListener("loadeddata", wrapped, { once: true });
        });
      },
    }), [facingMode, startCamera]);

    useEffect(() => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraReady(false);
        return;
      }
      startCamera(facingMode);
      const handleVisibility = () => {
        if (document.visibilityState === "visible" && !permissionDenied) startCamera(facingMode);
      };
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      };
    }, [facingMode, startCamera, permissionDenied]);

    // Mark camera ready when video actually has frames
    const handleCanPlay = useCallback(() => {
      const video = videoRef.current;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraReady(true);
        setRecovering(false);
        console.log("[Camera] canplay — ready", video.videoWidth, video.videoHeight);
      }
    }, []);

    const captureFromVideo = async () => {
      if (isCapturing || disabled) return;
      const v = videoRef.current;

      // If video isn't ready, try a quick restart instead of silently failing
      if (!v || !v.videoWidth || !v.videoHeight || v.paused) {
        console.warn("[Camera] Video not ready at capture time, attempting recovery", {
          videoWidth: v?.videoWidth, videoHeight: v?.videoHeight, paused: v?.paused, readyState: v?.readyState,
        });
        setRecovering(true);
        try {
          await startCamera(facingMode);
          // Wait for video to be ready (up to 2s)
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("timeout")), 2000);
            const check = () => {
              const vid = videoRef.current;
              if (vid && vid.videoWidth > 0 && vid.videoHeight > 0 && !vid.paused) {
                clearTimeout(timeout);
                resolve();
              } else {
                requestAnimationFrame(check);
              }
            };
            check();
          });
          setRecovering(false);
          setCameraReady(true);
        } catch {
          setRecovering(false);
          console.error("[Camera] Recovery failed, cannot capture");
          return;
        }
        // Retry capture once after recovery
        const v2 = videoRef.current;
        if (!v2 || !v2.videoWidth || !v2.videoHeight) return;
        return doCapture(v2);
      }

      return doCapture(v);
    };

    const doCapture = async (v: HTMLVideoElement) => {
      setIsCapturing(true);
      try {
        if ("vibrate" in navigator) navigator.vibrate(50);
        const blob = await processPhoto(v, filmType);
        onPhotoTaken(blob);
      } catch (err: any) {
        console.error("[Camera] Capture error:", err);
        // Show inline feedback — import toast from sonner
        const { toast } = await import("sonner");
        toast.error("Errore nello scatto", { description: err?.message || "Riprova" });
      } finally {
        setIsCapturing(false);
      }
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || isCapturing || disabled) return;
      setIsCapturing(true);
      try {
        const blob = await processPhoto(file, filmType);
        onPhotoTaken(blob);
      } catch (err: any) {
        console.error("[Camera] File process error:", err);
        const { toast } = await import("sonner");
        toast.error("Errore nell'elaborazione foto", { description: err?.message || "Riprova" });
      } finally {
        setIsCapturing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    const toggleCamera = () => {
      setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    };

    // Digit boxes for shot counter
    const ShotCounter = () => {
      const remaining = String(shotsRemaining).padStart(2, "0");
      const total = String(shotsTotal).padStart(2, "0");
      return (
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {remaining.split("").map((d, i) => (
              <span
                key={`r${i}`}
                className="inline-flex items-center justify-center w-7 h-9 rounded text-base font-mono font-bold text-white"
                style={{ background: "#2A2A2A" }}
              >
                {d}
              </span>
            ))}
          </div>
          <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
          <div className="flex gap-0.5">
            {total.split("").map((d, i) => (
              <span
                key={`t${i}`}
                className="inline-flex items-center justify-center w-7 h-9 rounded text-base font-mono font-bold"
                style={{ background: "#2A2A2A", color: GOLD }}
              >
                {d}
              </span>
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-wider ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            shots
          </span>
        </div>
      );
    };

    // Corner brackets for viewfinder
    const CornerBrackets = () => (
      <>
        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2" style={{ borderColor: GOLD }} />
        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2" style={{ borderColor: GOLD }} />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2" style={{ borderColor: GOLD }} />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2" style={{ borderColor: GOLD }} />
      </>
    );

    if (permissionDenied) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2 text-white">Permesso fotocamera negato</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Per scattare foto, consenti l'accesso alla fotocamera nelle impostazioni del tuo browser.
          </p>
          <label
            className="font-semibold px-6 py-3 rounded-full text-sm cursor-pointer active:scale-95 transition-transform"
            style={{ background: GOLD, color: "#1A1A1A" }}
          >
            Carica una foto
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
          </label>
        </div>
      );
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="text-5xl mb-4">📸</div>
          <h2 className="text-xl font-bold mb-2 text-white">Scatta una foto</h2>
          <div className="mb-4"><ShotCounter /></div>
          <label
            className="font-semibold px-6 py-3 rounded-full text-sm cursor-pointer active:scale-95 transition-transform"
            style={{ background: GOLD, color: "#1A1A1A" }}
          >
            {isCapturing ? "Elaborazione..." : "Scatta 📷"}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} disabled={isCapturing || disabled} />
          </label>
        </div>
      );
    }

    return (
      <div className="relative flex flex-col items-center" style={{ height: "100%" }}>
        {/* Viewfinder */}
        <div className="relative w-full flex-1 overflow-hidden" style={{ background: "#000" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={handleCanPlay}
            onLoadedMetadata={handleCanPlay}
            className="w-full h-full object-cover"
            style={{ filter: getCSSFilter(filmType) }}
          />

          {/* Recovery overlay */}
          {recovering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <p className="text-white text-sm font-mono animate-pulse">Riattivo fotocamera…</p>
            </div>
          )}

          <CornerBrackets />

          <div className="absolute bottom-6 right-6 text-[10px] font-mono tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
            FILM 400
          </div>

          <button
            onClick={toggleCamera}
            className="absolute top-4 left-1/2 -translate-x-1/2 p-2.5 rounded-full active:scale-90 transition-transform"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
          >
            <RotateCcw size={18} color="white" />
          </button>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between w-full px-6 py-4" style={{ background: "#1A1A1A" }}>
          <label className="p-2 cursor-pointer" style={{ color: "rgba(255,255,255,0.3)" }}>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} disabled={isCapturing || disabled} />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </label>

          <button
            onClick={captureFromVideo}
            disabled={isCapturing || disabled || recovering}
            className="w-[68px] h-[68px] rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
            style={{ border: `3px solid ${GOLD}` }}
          >
            <div
              className="w-[54px] h-[54px] rounded-full transition-colors"
              style={{ background: isCapturing ? "#E74C3C" : "rgba(255,255,255,0.9)" }}
            />
          </button>

          <ShotCounter />
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }
);

export default CameraViewfinder;
