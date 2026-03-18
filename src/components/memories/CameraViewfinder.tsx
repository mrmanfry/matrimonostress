import { useRef, useState, useEffect, useCallback } from "react";
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

export default function CameraViewfinder({
  filmType,
  shotsRemaining,
  shotsTotal,
  onPhotoTaken,
  disabled = false,
}: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // cameraReady will be set by onLoadedMetadata on the <video>
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

  const captureFromVideo = async () => {
    if (!videoRef.current || isCapturing || disabled) return;
    setIsCapturing(true);
    try {
      if ("vibrate" in navigator) navigator.vibrate(50);
      const blob = await processPhoto(videoRef.current, filmType);
      onPhotoTaken(blob);
    } catch (err) {
      console.error("Capture error:", err);
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
    } catch (err) {
      console.error("File process error:", err);
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
      {/* Top-left */}
      <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2" style={{ borderColor: GOLD }} />
      {/* Top-right */}
      <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2" style={{ borderColor: GOLD }} />
      {/* Bottom-left */}
      <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2" style={{ borderColor: GOLD }} />
      {/* Bottom-right */}
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
    <div className="relative flex flex-col items-center h-full">
      {/* Viewfinder */}
      <div className="relative w-full flex-1 overflow-hidden" style={{ background: "#000" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ filter: getCSSFilter(filmType) }}
        />

        {/* Corner brackets overlay */}
        <CornerBrackets />

        {/* FILM label */}
        <div className="absolute bottom-6 right-6 text-[10px] font-mono tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
          FILM 400
        </div>

        {/* Flip camera */}
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
        {/* File upload */}
        <label className="p-2 cursor-pointer" style={{ color: "rgba(255,255,255,0.3)" }}>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} disabled={isCapturing || disabled} />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </label>

        {/* Shutter */}
        <button
          onClick={captureFromVideo}
          disabled={!cameraReady || isCapturing || disabled}
          className="w-[68px] h-[68px] rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
          style={{ border: `3px solid ${GOLD}` }}
        >
          <div
            className="w-[54px] h-[54px] rounded-full transition-colors"
            style={{ background: isCapturing ? "#E74C3C" : "rgba(255,255,255,0.9)" }}
          />
        </button>

        {/* Shot counter */}
        <ShotCounter />
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
