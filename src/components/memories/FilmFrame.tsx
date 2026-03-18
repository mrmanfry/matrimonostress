const GOLD = "#C9A96E";

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
    <div className={`relative rounded overflow-hidden ${className}`} style={{ background: "#111" }}>
      {/* Sprocket holes top */}
      <div className="flex justify-between px-2 py-1" style={{ background: "#0A0A0A" }}>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1 rounded-full" style={{ background: "#2A2A2A" }} />
          ))}
        </div>
        <span className="text-[7px] font-mono tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
          disp. camera
        </span>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1 rounded-full" style={{ background: "#2A2A2A" }} />
          ))}
        </div>
      </div>

      {/* Photo */}
      <div className="aspect-square overflow-hidden">
        <img
          src={src}
          alt={guestName ? `Foto di ${guestName}` : "Foto dal rullino"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Bottom info */}
      <div className="px-2 py-1.5" style={{ background: "#0A0A0A" }}>
        <p className="text-[9px] font-mono truncate" style={{ color: GOLD }}>
          {guestName || "Anonimo"}
        </p>
        {formattedTime && (
          <p className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
            {formattedTime}
          </p>
        )}
      </div>
    </div>
  );
}
