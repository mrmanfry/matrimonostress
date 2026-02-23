import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const VISIT_KEY = "NSS_VISIT_COUNT";
const DISMISS_KEY = "NSS_INSTALL_DISMISSED";
const MAX_DISMISSALS = 3;
const MIN_VISITS = 2;

function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  const isStandalone = (window.navigator as any).standalone === true;
  return isIOS && isSafari && !isStandalone;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafari()) return;

    const dismissCount = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
    if (dismissCount >= MAX_DISMISSALS) return;

    const visitCount = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visitCount));

    if (visitCount >= MIN_VISITS) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    const current = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
    localStorage.setItem(DISMISS_KEY, String(current + 1));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4 max-w-sm mx-auto">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-sm">Installa Nozze Senza Stress</h3>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="bg-muted/30 rounded-lg p-1.5 shrink-0">
              <Share className="w-4 h-4 text-primary" />
            </span>
            <span>Tocca <strong>Condividi</strong> nella barra di Safari</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-muted/30 rounded-lg p-1.5 shrink-0">
              <Plus className="w-4 h-4 text-primary" />
            </span>
            <span>Poi <strong>Aggiungi alla schermata Home</strong></span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="w-full mt-3 text-xs text-muted-foreground"
        >
          Non ora
        </Button>
      </div>
    </div>
  );
}
