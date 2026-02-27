import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  Clock, 
  MapPin, 
  CheckCircle, 
  Circle, 
  Calendar,
  Building2,
  Sparkles,
  PartyPopper
} from "lucide-react";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { it } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string | null;
  location: string | null;
}

interface Vendor {
  id: string;
  name: string;
  status: string;
  category: { name: string } | null;
}

interface ChecklistStat {
  total: number;
  completed: number;
}

interface WeddingInfo {
  partner1: string;
  partner2: string;
  date: string;
}

interface VisibilitySettings {
  show_checklist: boolean;
  show_vendors: boolean;
  show_timeline: boolean;
  show_countdown: boolean;
}

const ProgressPublic = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [weddingInfo, setWeddingInfo] = useState<WeddingInfo | null>(null);
  const [visibility, setVisibility] = useState<VisibilitySettings>({
    show_checklist: true,
    show_vendors: true,
    show_timeline: true,
    show_countdown: true,
  });
  const [checklistStats, setChecklistStats] = useState<ChecklistStat>({ total: 0, completed: 0 });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      // Verify token
      const { data: tokenData, error: tokenError } = await supabase
        .from("progress_tokens")
        .select("wedding_id, expires_at, is_active, show_checklist, show_vendors, show_timeline, show_countdown")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        console.error("Token error:", tokenError);
        setError(true);
        setLoading(false);
        return;
      }

      // Check expiration and active status
      if (new Date(tokenData.expires_at) < new Date() || !tokenData.is_active) {
        setError(true);
        setLoading(false);
        return;
      }

      setVisibility({
        show_checklist: tokenData.show_checklist,
        show_vendors: tokenData.show_vendors,
        show_timeline: tokenData.show_timeline,
        show_countdown: tokenData.show_countdown,
      });

      const weddingId = tokenData.wedding_id;

      // Fetch wedding info
      const { data: weddingData } = await supabase
        .from("weddings")
        .select("partner1_name, partner2_name, wedding_date")
        .eq("id", weddingId)
        .single();

      if (weddingData) {
        setWeddingInfo({
          partner1: weddingData.partner1_name,
          partner2: weddingData.partner2_name,
          date: weddingData.wedding_date,
        });
      }

      // Fetch checklist stats
      if (tokenData.show_checklist) {
        const { data: tasksData } = await supabase
          .from("checklist_tasks")
          .select("status")
          .eq("wedding_id", weddingId);

        if (tasksData) {
          setChecklistStats({
            total: tasksData.length,
            completed: tasksData.filter(t => t.status === "completed").length,
          });
        }
      }

      // Fetch confirmed vendors
      if (tokenData.show_vendors) {
        const { data: vendorsData } = await supabase
          .from("vendors")
          .select("id, name, status, category:expense_categories(name)")
          .eq("wedding_id", weddingId)
          .eq("status", "confirmed")
          .order("name");

        if (vendorsData) {
          setVendors(vendorsData);
        }
      }

      // Fetch timeline events
      if (tokenData.show_timeline) {
        const { data: eventsData } = await supabase
          .from("timeline_events")
          .select("id, time, title, description, location")
          .eq("wedding_id", weddingId)
          .order("time", { ascending: true });

        if (eventsData) {
          setTimelineEvents(eventsData);
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Countdown calculation
  const countdown = useMemo(() => {
    if (!weddingInfo) return null;
    const weddingDate = new Date(weddingInfo.date);
    const now = new Date();
    
    const totalDays = differenceInDays(weddingDate, now);
    
    if (totalDays < 0) {
      return { passed: true, days: Math.abs(totalDays) };
    }
    
    if (totalDays === 0) {
      const hours = differenceInHours(weddingDate, now);
      const minutes = differenceInMinutes(weddingDate, now) % 60;
      return { today: true, hours, minutes };
    }
    
    const months = Math.floor(totalDays / 30);
    const weeks = Math.floor((totalDays % 30) / 7);
    const days = totalDays % 7;
    
    return { months, weeks, days, totalDays };
  }, [weddingInfo]);

  const progressPercentage = checklistStats.total > 0 
    ? Math.round((checklistStats.completed / checklistStats.total) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-purple-50">
        <div className="text-center">
          <Heart className="w-16 h-16 text-rose-400 fill-rose-400 mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-purple-50 p-4">
        <Card className="p-8 max-w-md text-center">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Link non valido</h1>
          <p className="text-muted-foreground">
            Questo link potrebbe essere scaduto o non più attivo.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-400/20 to-purple-400/20" />
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/80 backdrop-blur rounded-full shadow-lg">
              <Heart className="w-12 h-12 text-rose-500 fill-rose-500" />
            </div>
          </div>
          
          {weddingInfo && (
            <>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                {weddingInfo.partner1} <span className="text-rose-500">&</span> {weddingInfo.partner2}
              </h1>
              <p className="text-xl text-gray-600">
                {format(new Date(weddingInfo.date), "EEEE d MMMM yyyy", { locale: it })}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
        {/* Countdown */}
        {visibility.show_countdown && countdown && (
          <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-xl">
            {countdown.passed ? (
              <div className="space-y-4">
                <PartyPopper className="w-16 h-16 text-amber-500 mx-auto" />
                <h2 className="text-2xl font-bold text-gray-800">Sposati!</h2>
                <p className="text-gray-600">Da {countdown.days} giorni</p>
              </div>
            ) : countdown.today ? (
              <div className="space-y-4">
                <Sparkles className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
                <h2 className="text-3xl font-bold text-gray-800">OGGI È IL GRANDE GIORNO!</h2>
                <p className="text-xl text-gray-600">
                  {countdown.hours}h {countdown.minutes}m all'inizio
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-medium text-gray-500 mb-6">Mancano</h2>
                <div className="flex justify-center gap-6 md:gap-12">
                  {countdown.months > 0 && (
                    <div className="text-center">
                      <div className="text-5xl md:text-6xl font-bold text-rose-500">{countdown.months}</div>
                      <div className="text-sm text-gray-500 mt-1">mesi</div>
                    </div>
                  )}
                  {(countdown.weeks > 0 || countdown.months > 0) && (
                    <div className="text-center">
                      <div className="text-5xl md:text-6xl font-bold text-purple-500">{countdown.weeks}</div>
                      <div className="text-sm text-gray-500 mt-1">settimane</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-5xl md:text-6xl font-bold text-amber-500">{countdown.days}</div>
                    <div className="text-sm text-gray-500 mt-1">giorni</div>
                  </div>
                </div>
                <p className="text-gray-400 mt-6 text-sm">
                  {countdown.totalDays} giorni in totale
                </p>
              </>
            )}
          </Card>
        )}

        {/* Progress Section */}
        {visibility.show_checklist && checklistStats.total > 0 && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Progresso Organizzazione
              </h3>
              <span className="text-2xl font-bold text-green-500">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3 mb-3" />
            <p className="text-sm text-gray-500">
              {checklistStats.completed} di {checklistStats.total} attività completate
            </p>
          </Card>
        )}

        {/* Vendors Section */}
        {visibility.show_vendors && vendors.length > 0 && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-purple-500" />
              Fornitori Confermati
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{vendor.name}</p>
                    {vendor.category && (
                      <Badge variant="secondary" className="text-xs">
                        {vendor.category.name}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Timeline Section */}
        {visibility.show_timeline && timelineEvents.length > 0 && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-rose-500" />
              Programma del Giorno
            </h3>
            <div className="space-y-6">
              {timelineEvents.map((event, index) => (
                <div key={event.id} className="relative pl-8">
                  {/* Timeline line */}
                  {index < timelineEvents.length - 1 && (
                    <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-rose-200" />
                  )}

                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center shadow-md">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>

                  {/* Event content */}
                  <div className="pb-2">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-xl font-bold text-rose-500">
                        {event.time.slice(0, 5)}
                      </span>
                      <h4 className="text-lg font-semibold text-gray-800">{event.title}</h4>
                    </div>
                    {event.description && (
                      <p className="text-gray-600 mb-2">{event.description}</p>
                    )}
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

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 pt-8">
          Creato con ❤️ usando <span className="font-medium">WedsApp</span>
        </p>
      </div>
    </div>
  );
};

export default ProgressPublic;
