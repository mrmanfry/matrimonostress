import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Share2, Printer, Heart, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EventDialog } from "@/components/timeline/EventDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useIsOnline } from "@/hooks/useIsOnline";

type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  description: string | null;
  location: string | null;
  order_index: number;
};

const Timeline = () => {
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.weddingId : null;
  const isOnline = useIsOnline();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Cached query — persisted to IndexedDB for offline access
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["timeline-events", weddingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("time", { ascending: true });
      return (data ?? []) as TimelineEvent[];
    },
    enabled: !!weddingId,
  });

  // Check for existing share token
  const { data: existingToken } = useQuery({
    queryKey: ["timeline-token", weddingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("timeline_tokens")
        .select("token")
        .eq("wedding_id", weddingId!)
        .gt("expires_at", new Date().toISOString())
        .single();
      return data?.token ?? null;
    },
    enabled: !!weddingId,
    staleTime: 60 * 60 * 1000,
  });

  const computedShareUrl = existingToken
    ? `${window.location.origin}/timeline/${existingToken}`
    : shareUrl;

  const handleSave = async (event: Omit<TimelineEvent, "id" | "order_index">) => {
    if (!weddingId || !isOnline) return;

    if (editingEvent) {
      const { error } = await supabase
        .from("timeline_events")
        .update(event)
        .eq("id", editingEvent.id);

      if (error) {
        toast({ title: "Errore", description: "Impossibile aggiornare l'evento", variant: "destructive" });
      } else {
        toast({ title: "Evento aggiornato" });
        queryClient.invalidateQueries({ queryKey: ["timeline-events", weddingId] });
      }
    } else {
      const { error } = await supabase
        .from("timeline_events")
        .insert({
          ...event,
          wedding_id: weddingId,
          order_index: events.length,
        });

      if (error) {
        toast({ title: "Errore", description: "Impossibile creare l'evento", variant: "destructive" });
      } else {
        toast({ title: "Evento creato" });
        queryClient.invalidateQueries({ queryKey: ["timeline-events", weddingId] });
      }
    }

    setDialogOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = async (eventId: string) => {
    if (!isOnline) return;
    const { error } = await supabase
      .from("timeline_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare l'evento", variant: "destructive" });
    } else {
      toast({ title: "Evento eliminato" });
      queryClient.invalidateQueries({ queryKey: ["timeline-events", weddingId] });
    }
  };

  const handleShare = async () => {
    if (!weddingId || !isOnline) return;

    if (computedShareUrl) {
      navigator.clipboard.writeText(computedShareUrl);
      toast({ title: "Link copiato negli appunti!" });
      return;
    }

    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("timeline_tokens")
      .insert({ wedding_id: weddingId, token });

    if (error) {
      toast({ title: "Errore", description: "Impossibile generare il link", variant: "destructive" });
    } else {
      const url = `${window.location.origin}/timeline/${token}`;
      setShareUrl(url);
      navigator.clipboard.writeText(url);
      toast({ title: "Link generato e copiato!" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Heart className="w-12 h-12 text-accent fill-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Timeline Giorno del Matrimonio</h1>
            <p className="text-muted-foreground mt-1">
              {events.length} eventi programmati
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleShare} variant="outline" disabled={!isOnline}>
              <Share2 className="w-4 h-4 mr-2" />
              {computedShareUrl ? "Copia Link" : "Condividi"}
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Stampa
            </Button>
            <Button onClick={() => {
              setEditingEvent(null);
              setDialogOpen(true);
            }} disabled={!isOnline}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Evento
            </Button>
          </div>
        </div>

        <Card className="p-6">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nessun evento in programma. Inizia ad aggiungere gli eventi del tuo grande giorno!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={event.id} className="relative pl-8 pb-8 last:pb-0">
                  {index < events.length - 1 && (
                    <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                  )}
                  
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-background" />
                  </div>

                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-accent">
                            {event.time.slice(0, 5)}
                          </span>
                          <h3 className="text-lg font-semibold">{event.title}</h3>
                        </div>
                        {event.description && (
                          <p className="text-muted-foreground mb-2">{event.description}</p>
                        )}
                        {event.location && (
                          <p className="text-sm text-muted-foreground">
                            📍 {event.location}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!isOnline}
                          onClick={() => {
                            setEditingEvent(event);
                            setDialogOpen(true);
                          }}
                        >
                          Modifica
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!isOnline}
                          onClick={() => handleDelete(event.id)}
                        >
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </Card>

        <EventDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingEvent(null);
          }}
          event={editingEvent}
          onSave={handleSave}
        />
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl, .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Timeline;
