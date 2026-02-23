import { WifiOff } from "lucide-react";
import { useIsOnline } from "@/hooks/useIsOnline";

export function OfflineBanner() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-center gap-2 text-sm text-destructive shrink-0">
      <WifiOff className="w-4 h-4" />
      <span>Sei offline — le modifiche sono disabilitate</span>
    </div>
  );
}
