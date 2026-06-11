import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  /** Fallback route used when there's no browser history (e.g. PWA cold start). */
  fallback?: string;
  label?: string;
  className?: string;
}

/**
 * Pulsante "Indietro" da montare in cima alle viste di dettaglio/sotto-flusso.
 * Indispensabile in modalità PWA standalone su iOS dove non c'è il back del browser.
 */
export function BackButton({ fallback = "/app/dashboard", label = "Indietro", className }: BackButtonProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={className}
    >
      <ChevronLeft className="w-4 h-4 mr-1" />
      {label}
    </Button>
  );
}
