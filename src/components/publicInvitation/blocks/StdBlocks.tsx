import { useState } from "react";
import { Calendar, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { StdMessageBlock, StdResponseBlock } from "@/lib/invitationBlocks/types";
import { type WeddingPublicData, formatItalianDate } from "./_shared";

interface MsgProps {
  block: StdMessageBlock;
  wedding: WeddingPublicData;
  guestDisplayName: string;
}

export function StdMessageBlockView({ block, wedding, guestDisplayName }: MsgProps) {
  if (!block.visible) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { dayNumber, monthName, year } = formatItalianDate(wedding.weddingDate, wedding.timezone);

  return (
    <section className="px-6 py-12 text-center text-white relative z-10">
      <div className="max-w-lg mx-auto space-y-6">
        <p
          className="uppercase tracking-[0.3em] text-sm font-light"
          style={{ color: primaryColor }}
        >
          {config.label}
        </p>
        <div className="space-y-1">
          <p className="font-cormorant text-4xl sm:text-5xl font-semibold">
            {dayNumber} {monthName}
          </p>
          <p
            className="font-cormorant text-3xl sm:text-4xl font-light"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {year}
          </p>
        </div>
        <p className="font-playfair text-base sm:text-lg italic text-white/90 max-w-sm mx-auto leading-relaxed">
          "Ciao {guestDisplayName}! {config.quote}"
        </p>
      </div>
    </section>
  );
}

interface ResProps {
  block: StdResponseBlock;
  wedding: WeddingPublicData;
  coupleName: string;
  weddingLocation?: string | null;
  ceremonyStartTime?: string | null;
  isPreview?: boolean;
  isReadOnly?: boolean;
  onSubmit: (response: "likely_yes" | "likely_no" | "unsure") => Promise<void>;
}

export function StdResponseBlockView({
  block,
  wedding,
  coupleName,
  weddingLocation,
  ceremonyStartTime,
  isPreview,
  isReadOnly,
  onSubmit,
}: ResProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<"likely_yes" | "likely_no" | "unsure" | null>(null);
  const [showCal, setShowCal] = useState(false);
  if (!block.visible) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;

  const addToCalendar = (type: "google" | "apple" | "outlook") => {
    const eventTitle = encodeURIComponent(`Matrimonio ${coupleName}`);
    const eventLocation = encodeURIComponent(weddingLocation || "");
    const [hours, minutes] = (ceremonyStartTime || "16:00").split(":").map(Number);
    const eventDate = new Date(wedding.weddingDate + "T12:00:00");
    const start = new Date(eventDate);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + 12 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    if (type === "google") {
      window.open(
        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${fmt(start)}/${fmt(end)}&location=${eventLocation}&ctz=${wedding.timezone}`,
        "_blank"
      );
    } else if (type === "outlook") {
      window.open(
        `https://outlook.live.com/calendar/0/deeplink/compose?subject=${eventTitle}&location=${eventLocation}&startdt=${start.toISOString()}&enddt=${end.toISOString()}`,
        "_blank"
      );
    } else {
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//WedSapp//IT\nBEGIN:VEVENT\nDTSTART;TZID=${wedding.timezone}:${fmt(start)}\nDTEND;TZID=${wedding.timezone}:${fmt(end)}\nSUMMARY:Matrimonio ${coupleName}\nLOCATION:${weddingLocation || ""}\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([ics], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `matrimonio-${coupleName.replace(/\s+/g, "-").toLowerCase()}.ics`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File calendario scaricato!");
    }
    setShowCal(false);
  };

  const handleResponse = async (resp: "likely_yes" | "likely_no" | "unsure") => {
    if (isReadOnly || submitting) return;
    if (isPreview) {
      setSelected(resp);
      toast.info("Anteprima - click registrato!");
      return;
    }
    setSubmitting(true);
    setSelected(resp);
    try {
      await onSubmit(resp);
    } catch {
      toast.error("Si è verificato un errore. Riprova.");
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="px-6 pb-8 text-center text-white relative z-10">
      <div className="max-w-lg mx-auto space-y-4">
        {config.showCalendarButton && (
          <div className="relative">
            <button
              onClick={() => setShowCal(!showCal)}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-full backdrop-blur-md transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
              }}
            >
              <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="text-sm tracking-wide">Aggiungi al Calendario</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showCal && "rotate-180")} />
            </button>
            {showCal && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white/95 backdrop-blur-md rounded-xl shadow-xl overflow-hidden z-20">
                {(["google", "apple", "outlook"] as const).map((cal) => (
                  <button
                    key={cal}
                    onClick={() => addToCalendar(cal)}
                    className="w-full px-4 py-3 text-left text-gray-800 hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm"
                  >
                    <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                    <span className="capitalize">
                      {cal === "apple" ? "Apple Calendar" : cal === "google" ? "Google Calendar" : "Outlook"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!isReadOnly && (
          <div className="space-y-3 pt-3">
            <p className="text-white/70 text-xs tracking-wide uppercase">{config.title}</p>
            <div className="flex gap-2 justify-center">
              {[
                { value: "likely_yes" as const, label: config.yesLabel },
                { value: "unsure" as const, label: config.maybeLabel },
                { value: "likely_no" as const, label: config.noLabel },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleResponse(option.value)}
                  disabled={submitting}
                  className={cn(
                    "px-5 py-2.5 rounded-full backdrop-blur-md transition-all font-light tracking-wide text-sm",
                    selected === option.value ? "scale-105" : "hover:scale-[1.02]",
                    submitting && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    backgroundColor:
                      selected === option.value ? primaryColor : "rgba(255,255,255,0.1)",
                    border:
                      selected === option.value
                        ? `1px solid ${primaryColor}`
                        : "1px solid rgba(255,255,255,0.25)",
                    color: selected === option.value ? "white" : "rgba(255,255,255,0.9)",
                  }}
                >
                  {submitting && selected === option.value ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    option.label
                  )}
                </button>
              ))}
            </div>
            <p className="text-white/50 text-xs">{config.helperText}</p>
          </div>
        )}
      </div>
    </section>
  );
}
