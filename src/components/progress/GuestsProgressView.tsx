import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Heart, MapPin, Shirt, Calendar, Camera, Sparkles, PartyPopper } from "lucide-react";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { it } from "date-fns/locale";
import type { ProgressTokenRow } from "@/pages/ProgressPublic";
import QRCode from "react-qr-code";

interface WeddingInfo {
  partner1: string;
  partner2: string;
  date: string;
  ceremony_venue_name: string | null;
  ceremony_venue_address: string | null;
  reception_venue_name: string | null;
  reception_venue_address: string | null;
  location: string | null;
  dress_code: string | null;
}

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string | null;
  location: string | null;
}

export function GuestsProgressView({ tokenRow }: { tokenRow: ProgressTokenRow }) {
  const [wedding, setWedding] = useState<WeddingInfo | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [cameraToken, setCameraToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase
        .from("weddings")
        .select(
          "partner1_name, partner2_name, wedding_date, ceremony_venue_name, ceremony_venue_address, reception_venue_name, reception_venue_address, location, dress_code"
        )
        .eq("id", tokenRow.wedding_id)
        .maybeSingle();
      if (w) {
        setWedding({
          partner1: w.partner1_name,
          partner2: w.partner2_name,
          date: w.wedding_date,
          ceremony_venue_name: w.ceremony_venue_name,
          ceremony_venue_address: w.ceremony_venue_address,
          reception_venue_name: w.reception_venue_name,
          reception_venue_address: w.reception_venue_address,
          location: w.location,
          dress_code: (w as any).dress_code ?? null,
        });
      }

      if (tokenRow.show_timeline) {
        const { data: ev } = await supabase
          .from("timeline_events")
          .select("id, time, title, description, location")
          .eq("wedding_id", tokenRow.wedding_id)
          .order("time", { ascending: true });
        setEvents(ev || []);
      }

      if (tokenRow.show_memories_qr) {
        const { data: cam } = await supabase
          .from("disposable_cameras" as any)
          .select("token")
          .eq("wedding_id", tokenRow.wedding_id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cam && (cam as any).token) setCameraToken((cam as any).token);
      }
    })();
  }, [tokenRow.wedding_id, tokenRow.show_timeline, tokenRow.show_memories_qr]);

  const countdown = useMemo(() => {
    if (!wedding?.date) return null;
    const d = new Date(wedding.date);
    const now = new Date();
    const totalDays = differenceInDays(d, now);
    if (totalDays < 0) return { passed: true, days: Math.abs(totalDays) };
    if (totalDays === 0) {
      const hours = differenceInHours(d, now);
      const minutes = differenceInMinutes(d, now) % 60;
      return { today: true, hours, minutes };
    }
    const months = Math.floor(totalDays / 30);
    const weeks = Math.floor((totalDays % 30) / 7);
    const days = totalDays % 7;
    return { months, weeks, days, totalDays };
  }, [wedding?.date]);

  const cameraUrl = cameraToken ? `${window.location.origin}/camera/${cameraToken}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-400/20 to-purple-400/20" />
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/80 backdrop-blur rounded-full shadow-lg">
              <Heart className="w-12 h-12 text-rose-500 fill-rose-500" />
            </div>
          </div>
          {wedding && (
            <>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                {wedding.partner1} <span className="text-rose-500">&</span> {wedding.partner2}
              </h1>
              <p className="text-xl text-gray-600">
                {format(new Date(wedding.date), "EEEE d MMMM yyyy", { locale: it })}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
        {tokenRow.show_countdown && countdown && (
          <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-xl">
            {(countdown as any).passed ? (
              <div className="space-y-4">
                <PartyPopper className="w-16 h-16 text-amber-500 mx-auto" />
                <h2 className="text-2xl font-bold text-gray-800">Sposati!</h2>
                <p className="text-gray-600">Da {(countdown as any).days} giorni</p>
              </div>
            ) : (countdown as any).today ? (
              <div className="space-y-4">
                <Sparkles className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
                <h2 className="text-3xl font-bold text-gray-800">OGGI È IL GRANDE GIORNO!</h2>
                <p className="text-xl text-gray-600">
                  {(countdown as any).hours}h {(countdown as any).minutes}m all'inizio
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-medium text-gray-500 mb-6">Mancano</h2>
                <div className="flex justify-center gap-6 md:gap-12">
                  {(countdown as any).months > 0 && (
                    <div className="text-center">
                      <div className="text-5xl md:text-6xl font-bold text-rose-500">{(countdown as any).months}</div>
                      <div className="text-sm text-gray-500 mt-1">mesi</div>
                    </div>
                  )}
                  {((countdown as any).weeks > 0 || (countdown as any).months > 0) && (
                    <div className="text-center">
                      <div className="text-5xl md:text-6xl font-bold text-purple-500">{(countdown as any).weeks}</div>
                      <div className="text-sm text-gray-500 mt-1">settimane</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-5xl md:text-6xl font-bold text-amber-500">{(countdown as any).days}</div>
                    <div className="text-sm text-gray-500 mt-1">giorni</div>
                  </div>
                </div>
                <p className="text-gray-400 mt-6 text-sm">{(countdown as any).totalDays} giorni in totale</p>
              </>
            )}
          </Card>
        )}

        {tokenRow.show_timeline && events.length > 0 && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-rose-500" />
              Programma del giorno
            </h3>
            <div className="space-y-6">
              {events.map((event, i) => (
                <div key={event.id} className="relative pl-8">
                  {i < events.length - 1 && (
                    <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-rose-200" />
                  )}
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center shadow-md">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="pb-2">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-xl font-bold text-rose-500">{event.time.slice(0, 5)}</span>
                      <h4 className="text-lg font-semibold text-gray-800">{event.title}</h4>
                    </div>
                    {event.description && <p className="text-gray-600 mb-2">{event.description}</p>}
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tokenRow.show_location && wedding && (wedding.ceremony_venue_address || wedding.reception_venue_address || wedding.location) && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-rose-500" />
              Dove
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {wedding.ceremony_venue_address && (
                <VenueBlock
                  title="Cerimonia"
                  name={wedding.ceremony_venue_name}
                  address={wedding.ceremony_venue_address}
                />
              )}
              {wedding.reception_venue_address && (
                <VenueBlock
                  title="Ricevimento"
                  name={wedding.reception_venue_name}
                  address={wedding.reception_venue_address}
                />
              )}
              {!wedding.ceremony_venue_address && !wedding.reception_venue_address && wedding.location && (
                <VenueBlock title="Location" name={null} address={wedding.location} />
              )}
            </div>
          </Card>
        )}

        {tokenRow.show_dress_code && wedding?.dress_code && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Shirt className="w-5 h-5 text-purple-500" />
              Dress code
            </h3>
            <p className="text-gray-700 whitespace-pre-line">{wedding.dress_code}</p>
          </Card>
        )}

        {tokenRow.show_memories_qr && cameraUrl && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg text-center">
            <h3 className="text-lg font-semibold flex items-center justify-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-amber-500" />
              Scatta con noi
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-5">
              Inquadra il codice per aprire la fotocamera condivisa del matrimonio e contribuire con le tue foto.
            </p>
            <div className="inline-block p-4 bg-white rounded-xl shadow-inner">
              <QRCode value={cameraUrl} size={180} />
            </div>
            <p className="text-xs text-gray-400 mt-3 break-all">{cameraUrl}</p>
          </Card>
        )}

        <p className="text-center text-sm text-gray-400 pt-8">
          Creato con ❤️ usando <span className="font-medium">WedsApp</span>
        </p>
      </div>
    </div>
  );
}

function VenueBlock({ title, name, address }: { title: string; name: string | null; address: string }) {
  const maps = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  return (
    <a
      href={maps}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg bg-gradient-to-br from-rose-50 to-purple-50 border border-rose-100 hover:shadow-md transition"
    >
      <p className="text-xs uppercase tracking-wide text-rose-500 font-semibold">{title}</p>
      {name && <p className="font-medium text-gray-800 mt-1">{name}</p>}
      <p className="text-sm text-gray-600 mt-0.5">{address}</p>
    </a>
  );
}
