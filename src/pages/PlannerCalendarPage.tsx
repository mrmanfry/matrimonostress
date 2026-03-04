import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, WeddingContext } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarDays,
  MapPin,
  Clock,
  Church,
  UtensilsCrossed,
  Phone,
  Mail,
  User,
  Package,
  Search,
  X,
  Filter,
} from "lucide-react";

const WEDDING_COLORS = [
  "hsl(var(--primary))",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#EC4899",
  "#10B981",
];

export default function PlannerCalendarPage() {
  const { authState } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWeddingId, setFilterWeddingId] = useState<string>("all");
  const [filterVendor, setFilterVendor] = useState<string>("all");

  const weddings: WeddingContext[] =
    authState.status === "authenticated" ? authState.weddings || [] : [];
  const weddingIds = weddings.map((w) => w.weddingId);

  // Fetch wedding details
  const { data: weddingDetails } = useQuery({
    queryKey: ["planner-wedding-details", weddingIds],
    queryFn: async () => {
      if (!weddingIds.length) return [];
      const { data } = await supabase
        .from("weddings")
        .select("id, partner1_name, partner2_name, wedding_date, ceremony_venue_name, ceremony_venue_address, ceremony_start_time, reception_venue_name, reception_venue_address, reception_start_time, location")
        .in("id", weddingIds);
      return data || [];
    },
    enabled: weddingIds.length > 0,
  });

  // Fetch appointments across all weddings
  const { data: appointments } = useQuery({
    queryKey: ["planner-appointments", weddingIds],
    queryFn: async () => {
      if (!weddingIds.length) return [];
      const { data } = await supabase
        .from("vendor_appointments")
        .select("*, vendors(name)")
        .in("wedding_id", weddingIds)
        .eq("status", "scheduled")
        .order("appointment_date", { ascending: true });
      return data || [];
    },
    enabled: weddingIds.length > 0,
  });

  // Fetch vendors across all weddings
  const { data: vendors } = useQuery({
    queryKey: ["planner-vendors", weddingIds],
    queryFn: async () => {
      if (!weddingIds.length) return [];
      const { data } = await supabase
        .from("vendors")
        .select("id, name, contact_name, phone, email, wedding_id")
        .in("wedding_id", weddingIds)
        .not("status", "eq", "rejected");
      return data || [];
    },
    enabled: weddingIds.length > 0,
  });

  // Build event dates for the calendar
  const eventDates = useMemo(() => {
    const dates: Date[] = [];
    weddings.forEach((w) => dates.push(new Date(w.weddingDate)));
    appointments?.forEach((a: any) => dates.push(new Date(a.appointment_date)));
    return dates;
  }, [weddings, appointments]);

  // Events for a specific day
  const getEventsForDay = (day: Date) => {
    const dayEvents: { label: string; color: string; time?: string; weddingId?: string }[] = [];
    weddings.forEach((w, i) => {
      if (isSameDay(new Date(w.weddingDate), day)) {
        dayEvents.push({
          label: `💍 ${w.partner1Name} & ${w.partner2Name}`,
          color: WEDDING_COLORS[i % WEDDING_COLORS.length],
          weddingId: w.weddingId,
        });
      }
    });
    appointments?.forEach((a: any) => {
      if (isSameDay(new Date(a.appointment_date), day)) {
        const wIdx = weddingIds.indexOf(a.wedding_id);
        dayEvents.push({
          label: a.title,
          color: WEDDING_COLORS[wIdx % WEDDING_COLORS.length],
          time: a.appointment_time?.slice(0, 5),
          weddingId: a.wedding_id,
        });
      }
    });
    return dayEvents;
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // Unique vendors list for filter dropdown
  const uniqueVendors = useMemo(() => {
    const map = new Map<string, string>();
    vendors?.forEach((v: any) => map.set(v.id, v.name));
    return Array.from(map.entries()); // [id, name]
  }, [vendors]);

  // Check if any filter is active
  const hasActiveFilters = !!selectedDay || searchQuery.trim() !== "" || filterWeddingId !== "all" || filterVendor !== "all";

  const clearAllFilters = () => {
    setSelectedDay(undefined);
    setSearchQuery("");
    setFilterWeddingId("all");
    setFilterVendor("all");
  };

  // --- Filtered wedding details ---
  const filteredWeddingDetails = useMemo(() => {
    if (!weddingDetails) return [];
    let filtered = [...weddingDetails];

    // Filter by selected wedding
    if (filterWeddingId !== "all") {
      filtered = filtered.filter((w: any) => w.id === filterWeddingId);
    }

    // Filter by search query (name, venue)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((w: any) =>
        `${w.partner1_name} ${w.partner2_name} ${w.ceremony_venue_name || ""} ${w.reception_venue_name || ""} ${w.location || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    // Filter by selected day: show weddings happening on that day
    if (selectedDay) {
      filtered = filtered.filter((w: any) =>
        isSameDay(new Date(w.wedding_date), selectedDay)
      );
    }

    // Filter by vendor: show only weddings that have that vendor
    if (filterVendor !== "all") {
      const vendorWeddingIds = new Set(
        vendors?.filter((v: any) => v.id === filterVendor).map((v: any) => v.wedding_id) || []
      );
      filtered = filtered.filter((w: any) => vendorWeddingIds.has(w.id));
    }

    return filtered;
  }, [weddingDetails, filterWeddingId, searchQuery, selectedDay, filterVendor, vendors]);

  // --- Filtered appointments for the events list ---
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    let filtered = [...appointments];

    if (filterWeddingId !== "all") {
      filtered = filtered.filter((a: any) => a.wedding_id === filterWeddingId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a: any) =>
        `${a.title} ${(a.vendors as any)?.name || ""}`.toLowerCase().includes(q)
      );
    }

    if (selectedDay) {
      filtered = filtered.filter((a: any) =>
        isSameDay(new Date(a.appointment_date), selectedDay)
      );
    }

    if (filterVendor !== "all") {
      filtered = filtered.filter((a: any) => a.vendor_id === filterVendor);
    }

    return filtered;
  }, [appointments, filterWeddingId, searchQuery, selectedDay, filterVendor]);

  // --- Filtered contacts (weddings + their vendors) ---
  const filteredContactWeddings = useMemo(() => {
    let filtered = [...weddings];

    if (filterWeddingId !== "all") {
      filtered = filtered.filter((w) => w.weddingId === filterWeddingId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      // Include wedding if couple name or any vendor matches
      filtered = filtered.filter((w) => {
        const coupleMatch = `${w.partner1Name} ${w.partner2Name}`.toLowerCase().includes(q);
        const vendorMatch = vendors?.some(
          (v: any) =>
            v.wedding_id === w.weddingId &&
            `${v.name} ${v.contact_name || ""}`.toLowerCase().includes(q)
        );
        return coupleMatch || vendorMatch;
      });
    }

    if (filterVendor !== "all") {
      const vendorWeddingIds = new Set(
        vendors?.filter((v: any) => v.id === filterVendor).map((v: any) => v.wedding_id) || []
      );
      filtered = filtered.filter((w) => vendorWeddingIds.has(w.weddingId));
    }

    return filtered;
  }, [weddings, filterWeddingId, searchQuery, filterVendor, vendors]);

  const getFilteredVendorsForWedding = (weddingId: string) => {
    let wVendors = vendors?.filter((v: any) => v.wedding_id === weddingId) || [];
    if (filterVendor !== "all") {
      wVendors = wVendors.filter((v: any) => v.id === filterVendor);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      wVendors = wVendors.filter((v: any) =>
        `${v.name} ${v.contact_name || ""}`.toLowerCase().includes(q)
      );
    }
    return wVendors;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-serif font-bold text-foreground">
        Calendario Planner
      </h1>

      {/* Calendar + Day Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <Calendar
              mode="multiple"
              selected={eventDates}
              month={month}
              onMonthChange={setMonth}
              onDayClick={setSelectedDay}
              className="p-0 w-full pointer-events-auto"
              modifiersStyles={{
                selected: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  fontWeight: 700,
                },
              }}
            />
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-2">
              {weddings.map((w, i) => (
                <div
                  key={w.weddingId}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: WEDDING_COLORS[i % WEDDING_COLORS.length],
                    }}
                  />
                  <span className="truncate max-w-[120px]">
                    {w.partner1Name} & {w.partner2Name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Day preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedDay
                ? format(selectedDay, "d MMMM yyyy", { locale: it })
                : "Seleziona un giorno"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedDayEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nessun evento in questo giorno
              </p>
            )}
            {selectedDayEvents.map((ev, i) => (
              <div key={i} className="flex items-start gap-2">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: ev.color }}
                />
                <div>
                  <p className="text-sm font-medium">{ev.label}</p>
                  {ev.time && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {ev.time}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cerca nome, fornitore..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>

            {/* Filter by wedding */}
            <Select value={filterWeddingId} onValueChange={setFilterWeddingId}>
              <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm">
                <SelectValue placeholder="Tutti i matrimoni" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i matrimoni</SelectItem>
                {weddings.map((w) => (
                  <SelectItem key={w.weddingId} value={w.weddingId}>
                    {w.partner1Name} & {w.partner2Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter by vendor */}
            {uniqueVendors.length > 0 && (
              <Select value={filterVendor} onValueChange={setFilterVendor}>
                <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm">
                  <SelectValue placeholder="Tutti i fornitori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i fornitori</SelectItem>
                  {uniqueVendors.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Selected date chip */}
            {selectedDay && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {format(selectedDay, "d MMM", { locale: it })}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setSelectedDay(undefined)}
                />
              </Badge>
            )}

            {/* Clear all */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 text-xs text-muted-foreground"
              >
                Resetta filtri
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wedding Detail Cards + Contacts */}
      <Tabs defaultValue="weddings">
        <TabsList>
          <TabsTrigger value="weddings">
            <CalendarDays className="w-4 h-4 mr-1.5" /> Matrimoni
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Clock className="w-4 h-4 mr-1.5" /> Appuntamenti
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <Phone className="w-4 h-4 mr-1.5" /> Contatti
          </TabsTrigger>
        </TabsList>

        {/* Weddings Tab */}
        <TabsContent value="weddings" className="space-y-4 mt-4">
          {filteredWeddingDetails.map((w: any) => (
            <Card key={w.id} className="overflow-hidden">
              <div
                className="h-1"
                style={{
                  backgroundColor:
                    WEDDING_COLORS[weddingIds.indexOf(w.id) % WEDDING_COLORS.length],
                }}
              />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-semibold">
                    {w.partner1_name} & {w.partner2_name}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(w.wedding_date), "d MMM yyyy", { locale: it })}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {w.ceremony_venue_name && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Church className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{w.ceremony_venue_name}</p>
                        {w.ceremony_venue_address && <p className="text-xs">{w.ceremony_venue_address}</p>}
                        {w.ceremony_start_time && (
                          <p className="text-xs flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {w.ceremony_start_time.slice(0, 5)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {w.reception_venue_name && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <UtensilsCrossed className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{w.reception_venue_name}</p>
                        {w.reception_venue_address && <p className="text-xs">{w.reception_venue_address}</p>}
                        {w.reception_start_time && (
                          <p className="text-xs flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {w.reception_start_time.slice(0, 5)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {!w.ceremony_venue_name && !w.reception_venue_name && w.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{w.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredWeddingDetails.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {hasActiveFilters ? "Nessun matrimonio corrisponde ai filtri" : "Nessun matrimonio trovato"}
            </p>
          )}
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-3 mt-4">
          {filteredAppointments.map((a: any) => {
            const wIdx = weddingIds.indexOf(a.wedding_id);
            const wedding = weddings.find((w) => w.weddingId === a.wedding_id);
            return (
              <Card key={a.id} className="overflow-hidden">
                <div
                  className="h-1"
                  style={{ backgroundColor: WEDDING_COLORS[wIdx % WEDDING_COLORS.length] }}
                />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {(a.vendors as any)?.name} — {wedding?.partner1Name} & {wedding?.partner2Name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(a.appointment_date), "d MMM", { locale: it })}
                      </Badge>
                      {a.appointment_time && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" /> {a.appointment_time.slice(0, 5)}
                        </p>
                      )}
                    </div>
                  </div>
                  {a.location && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {a.location}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredAppointments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {hasActiveFilters ? "Nessun appuntamento corrisponde ai filtri" : "Nessun appuntamento trovato"}
            </p>
          )}
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6 mt-4">
          {filteredContactWeddings.map((w, wIdx) => {
            const wVendors = getFilteredVendorsForWedding(w.weddingId);
            return (
              <Card key={w.weddingId}>
                <div
                  className="h-1"
                  style={{
                    backgroundColor: WEDDING_COLORS[wIdx % WEDDING_COLORS.length],
                  }}
                />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {w.partner1Name} & {w.partner2Name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Couple contacts */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Sposi
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{w.partner1Name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{w.partner2Name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vendor contacts */}
                  {wVendors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Fornitori
                      </p>
                      <div className="space-y-2">
                        {wVendors.map((v: any) => (
                          <div
                            key={v.id}
                            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                          >
                            <span className="flex items-center gap-1.5 font-medium">
                              <Package className="w-3.5 h-3.5 text-muted-foreground" />
                              {v.name}
                            </span>
                            {v.contact_name && (
                              <span className="text-muted-foreground text-xs">{v.contact_name}</span>
                            )}
                            {v.phone && (
                              <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Phone className="w-3 h-3" /> {v.phone}
                              </a>
                            )}
                            {v.email && (
                              <a href={`mailto:${v.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Mail className="w-3 h-3" /> {v.email}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredContactWeddings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {hasActiveFilters ? "Nessun contatto corrisponde ai filtri" : "Nessun contatto trovato"}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
