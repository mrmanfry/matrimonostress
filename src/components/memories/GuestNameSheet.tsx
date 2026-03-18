import { useState } from "react";

interface GuestNameSheetProps {
  open: boolean;
  onSubmit: (name: string) => void;
  onSkip: () => void;
}

export default function GuestNameSheet({ open, onSubmit, onSkip }: GuestNameSheetProps) {
  const [name, setName] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onSkip} />

      {/* Sheet */}
      <div className="relative bg-zinc-900 rounded-t-2xl w-full max-w-md p-6 pb-8 animate-in slide-in-from-bottom duration-300">
        <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-5" />
        <h3 className="text-white text-lg font-semibold mb-1">Come ti chiami?</h3>
        <p className="text-white/50 text-sm mb-4">
          Facoltativo — così gli sposi sapranno chi ha scattato la foto!
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Il tuo nome"
          autoFocus
          className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:border-white/30 focus:outline-none mb-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
          }}
        />
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 text-white/60 text-sm py-3 rounded-lg active:bg-zinc-800"
          >
            Salta
          </button>
          <button
            onClick={() => onSubmit(name.trim() || "Anonimo")}
            className="flex-1 bg-white text-black font-semibold text-sm py-3 rounded-lg active:scale-95 transition-transform"
          >
            Conferma
          </button>
        </div>
      </div>
    </div>
  );
}
