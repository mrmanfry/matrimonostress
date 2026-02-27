import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Heart, Clock, MapPin } from "lucide-react";

type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  description: string | null;
  location: string | null;
};

const TimelinePublic = () => {
  const { token } = useParams<{ token: string }>();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [weddingInfo, setWeddingInfo] = useState<{ partner1: string; partner2: string; date: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchTimeline();
  }, [token]);

  const fetchTimeline = async () => {
    if (!token) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      // Verify token and get wedding_id
      const { data: tokenData, error: tokenError } = await supabase
        .from("timeline_tokens")
        .select("wedding_id, expires_at")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        setError(true);
        setLoading(false);
        return;
      }

      // Check if token is expired
      if (new Date(tokenData.expires_at) < new Date()) {
        setError(true);
        setLoading(false);
        return;
      }

      // Fetch wedding info
      const { data: weddingData } = await supabase
        .from("weddings")
        .select("partner1_name, partner2_name, wedding_date")
        .eq("id", tokenData.wedding_id)
        .single();

      if (weddingData) {
        setWeddingInfo({
          partner1: weddingData.partner1_name,
          partner2: weddingData.partner2_name,
          date: weddingData.wedding_date,
        });
      }

      // Fetch timeline events
      const { data: eventsData } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("wedding_id", tokenData.wedding_id)
        .order("time", { ascending: true });

      if (eventsData) {
        setEvents(eventsData);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/10">
        <Heart className="w-12 h-12 text-accent fill-accent animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/10 p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Link non valido</h1>
          <p className="text-muted-foreground">
            Questo link potrebbe essere scaduto o non valido.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/10 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Heart className="w-12 h-12 text-accent fill-accent mx-auto mb-4" />
          {weddingInfo && (
            <>
              <h1 className="text-3xl md:text-4xl font-bold">
                {weddingInfo.partner1} & {weddingInfo.partner2}
              </h1>
              <p className="text-xl text-muted-foreground">
                {new Date(weddingInfo.date).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            Timeline del grande giorno
          </p>
        </div>

        {/* Timeline */}
        <Card className="p-6">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nessun evento programmato</p>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="relative pl-8 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {index < events.length - 1 && (
                    <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                  )}

                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-background" />
                  </div>

                  {/* Event content */}
                  <div>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-2xl font-bold text-accent">
                        {event.time.slice(0, 5)}
                      </span>
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                    </div>
                    {event.description && (
                      <p className="text-muted-foreground mb-2 pl-1">
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Creato con ❤️ con WedsApp
        </p>
      </div>
    </div>
  );
};

export default TimelinePublic;
