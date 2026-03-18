import { CloudOff } from "lucide-react";

interface OfflineQueueBadgeProps {
  count: number;
}

export default function OfflineQueueBadge({ count }: OfflineQueueBadgeProps) {
  if (count <= 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-500/90 backdrop-blur-sm text-black text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-2 animate-in fade-in">
      <CloudOff size={14} />
      {count} foto in attesa di rete
    </div>
  );
}
