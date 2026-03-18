interface FilmFrameProps {
  src: string;
  guestName?: string | null;
  timestamp?: string;
  className?: string;
}

export default function FilmFrame({ src, guestName, timestamp, className = "" }: FilmFrameProps) {
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleString("it-IT", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className={`bg-zinc-900 rounded-lg overflow-hidden shadow-lg ${className}`}>
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={src}
          alt={guestName ? `Foto di ${guestName}` : "Foto dal rullino"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {/* Polaroid-style bottom */}
      <div className="px-3 py-2 bg-zinc-900">
        <p className="text-white/70 text-xs font-mono truncate">
          {guestName || "Anonimo"}
        </p>
        {formattedTime && (
          <p className="text-white/40 text-[10px] font-mono">{formattedTime}</p>
        )}
      </div>
    </div>
  );
}
