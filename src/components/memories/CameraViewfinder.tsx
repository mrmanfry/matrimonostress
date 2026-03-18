import { useRef, useState, useEffect, useCallback } from "react";
import { processPhoto, getCSSFilter, type FilmType } from "@/lib/cameraFilters";
import { Camera, RotateCcw, X } from "lucide-react";

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
      // Stop existing stream
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
      }
      setCameraReady(true);
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
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraReady(false);
      return;
    }

    startCamera(facingMode);

    // Handle tab visibility change
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !permissionDenied) {
        startCamera(facingMode);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, startCamera, permissionDenied]);

  const captureFromVideo = async () => {
    if (!videoRef.current || isCapturing || disabled) return;
    setIsCapturing(true);

    try {
      // Haptic feedback
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

  // Permission denied state
  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-white text-xl font-bold mb-2">
          Permesso fotocamera negato
        </h2>
        <p className="text-white/60 text-sm mb-6 max-w-xs">
          Per scattare foto, consenti l'accesso alla fotocamera nelle
          impostazioni del tuo browser.
        </p>
        <label className="bg-white text-black font-semibold px-6 py-3 rounded-full text-sm cursor-pointer active:scale-95 transition-transform">
          Carica una foto
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      </div>
    );
  }

  // Fallback for devices without getUserMedia
  if (!navigator.mediaDevices?.getUserMedia) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-5xl mb-4">📸</div>
        <h2 className="text-white text-xl font-bold mb-2">Scatta una foto</h2>
        <p className="text-white/60 text-sm mb-4">
          {shotsRemaining} / {shotsTotal} scatti rimanenti
        </p>
        <label className="bg-white text-black font-semibold px-6 py-3 rounded-full text-sm cursor-pointer active:scale-95 transition-transform">
          {isCapturing ? "Elaborazione..." : "Scatta 📷"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInput}
            disabled={isCapturing || disabled}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center h-full">
      {/* Viewfinder */}
      <div className="relative w-full flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ filter: getCSSFilter(filmType) }}
        />

        {/* Shot counter */}
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs font-mono px-3 py-1.5 rounded-full">
          {shotsRemaining} / {shotsTotal}
        </div>

        {/* Flip camera button */}
        <button
          onClick={toggleCamera}
          className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white p-2 rounded-full active:scale-90 transition-transform"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 py-6 bg-black w-full">
        {/* File upload fallback */}
        <label className="text-white/50 p-2 cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
            disabled={isCapturing || disabled}
          />
          <Camera size={24} />
        </label>

        {/* Shutter button */}
        <button
          onClick={captureFromVideo}
          disabled={!cameraReady || isCapturing || disabled}
          className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all ${
            isCapturing ? "bg-red-500" : "bg-white/10"
          } disabled:opacity-40`}
        >
          <div className={`w-12 h-12 rounded-full ${isCapturing ? "bg-red-400" : "bg-white"}`} />
        </button>

        {/* Spacer */}
        <div className="w-10" />
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
