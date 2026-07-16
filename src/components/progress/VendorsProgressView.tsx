import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Phone, Hash, Wrench, User as UserIcon, Utensils, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { ProgressTokenRow } from "@/pages/ProgressPublic";
import { buildGuestScenarios } from "@/lib/guestScenarios";

interface WeddingInfo {
  partner1: string;
  partner2: string;
  date: string;
  ceremony_start_time: string | null;
  ceremony_venue_name: string | null;
  ceremony_venue_address: string | null;
  reception_venue_name: string | null;
  reception_venue_address: string | null;
  reception_start_time: string | null;
  location: string | null;
  logistical_notes: string | null;
  target_adults: number | null;
  target_children: number | null;
  target_staff: number | null;
}

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string | null;
  location: string | null;
}

interface Contact {
  name: string;
  role: string;
}

interface OpNumbers {
  adults: number;
  children: number;
  staff: number;
  total: number;
  dietary_count: number;
  tables: number;
}

export function VendorsProgressView({ tokenRow }: { tokenRow: ProgressTokenRow }) {
  const [wedding, setWedding] = useState<WeddingInfo | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [ops, setOps] = useState<OpNumbers | null>(null);

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase
        .from("weddings")
        .select(
          "partner1_name, partner2_name, wedding_date, ceremony_start_time, ceremony_venue_name, ceremony_venue_address, reception_venue_name, reception_venue_address, reception_start_time, location, logistical_notes, target_adults, target_children, target_staff"
        )
        .eq("id", tokenRow.wedding_id)
        .maybeSingle();

      if (w) {
        setWedding({
          partner1: w.partner1_name,
          partner2: w.partner2_name,
          date: w.wedding_date,
          ceremony_start_time: w.ceremony_start_time,
          ceremony_venue_name: w.ceremony_venue_name,
          ceremony_venue_address: w.ceremony_venue_address,
          reception_venue_name: w.reception_venue_name,
          reception_venue_address: w.reception_venue_address,
          reception_start_time: w.reception_start_time,
          location: w.location,
          logistical_notes: (w as any).logistical_notes ?? null,
          target_adults: w.target_adults,
          target_children: w.target_children,
          target_staff: w.target_staff,
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

      if (tokenRow.show_vendor_contacts) {
        // Coppia (nomi già presenti); planner/co-planner dai user_roles + profiles
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("wedding_id", tokenRow.wedding_id)
          .in("role", ["co_planner", "planner"]);
        const ids = (roles || []).map((r: any) => r.user_id);
        let profiles: any[] = [];
        if (ids.length) {
          const { data: p } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", ids);
          profiles = p || [];
        }
        const list: Contact[] = [];
        if (w) list.push({ name: `${w.partner1_name} & ${w.partner2_name}`, role: "Coppia" });
        (roles || []).forEach((r: any) => {
          const p = profiles.find((x) => x.id === r.user_id);
          if (!p) return;
          const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim();
          if (!fullName) return;
          list.push({ name: fullName, role: r.role === "co_planner" ? "Co-planner" : "Wedding planner" });
        });
        setContacts(list);
      }

      if (tokenRow.show_operational_numbers) {
        const [guestsRes, vendorsRes, tablesRes] = await Promise.all([
          supabase
            .from("guests")
            .select("id, rsvp_status, is_child, is_staff, is_couple_member, allow_plus_one, plus_one_name, plus_one_of_guest_id, dietary_restrictions")
            .eq("wedding_id", tokenRow.wedding_id),
          supabase.from("vendors").select("staff_meals_count").eq("wedding_id", tokenRow.wedding_id),
          supabase.from("tables").select("id", { count: "exact", head: true }).eq("wedding_id", tokenRow.wedding_id),
        ]);
        const guests = (guestsRes.data || []) as any[];
        const vendors = (vendorsRes.data || []) as any[];
        const scenarios = buildGuestScenarios(guests, vendors, {
          target_adults: w?.target_adults ?? null,
          target_children: w?.target_children ?? null,
          target_staff: w?.target_staff ?? null,
        });
        const dietary_count = guests.filter(
          (g) => !g.is_staff && (g.dietary_restrictions || "").toString().trim().length > 0
        ).length;
        setOps({
          adults: scenarios.confirmed.adults,
          children: scenarios.confirmed.children,
          staff: scenarios.confirmed.staff,
          total: scenarios.confirmed.total,
          dietary_count,
          tables: tablesRes.count || 0,
        });
      }
    })();
  }, [
    tokenRow.wedding_id,
    tokenRow.show_timeline,
    tokenRow.show_vendor_contacts,
    tokenRow.show_operational_numbers,
  ]);

  const headerDate = useMemo(() => {
    if (!wedding?.date) return "";
    return format(new Date(wedding.date), "EEEE d MMMM yyyy", { locale: it });
  }, [wedding?.date]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-900 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                Briefing operativo fornitori
              </p>
              {wedding && (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
                    {wedding.partner1} & {wedding.partner2}
                  </h1>
                  <p className="text-slate-600 mt-1">
                    {headerDate}
                    {wedding.ceremony_start_time && ` — inizio cerimonia ${wedding.ceremony_start_time.slice(0, 5)}`}
                  </p>
                </>
              )}
              {tokenRow.label && (
                <p className="text-sm text-slate-500 mt-2">Riferimento: {tokenRow.label}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {tokenRow.show_timeline && events.length > 0 && (
          <Card className="p-6">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-5 text-slate-900">
              <Calendar className="w-5 h-5 text-slate-700" />
              Timeline operativa
            </h3>
            <div className="divide-y divide-slate-100">
              {events.map((e) => (
                <div key={e.id} className="py-3 grid grid-cols-[80px_1fr] gap-4">
                  <div className="font-mono font-semibold text-slate-900">{e.time.slice(0, 5)}</div>
                  <div>
                    <p className="font-medium text-slate-900">{e.title}</p>
                    {e.description && <p className="text-sm text-slate-600 mt-0.5">{e.description}</p>}
                    {e.location && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {e.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tokenRow.show_addresses && wedding && (
          <Card className="p-6">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-5 text-slate-900">
              <MapPin className="w-5 h-5 text-slate-700" />
              Location e indirizzi
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {wedding.ceremony_venue_address && (
                <AddressBlock
                  title="Cerimonia"
                  name={wedding.ceremony_venue_name}
                  address={wedding.ceremony_venue_address}
                  time={wedding.ceremony_start_time}
                />
              )}
              {wedding.reception_venue_address && (
                <AddressBlock
                  title="Ricevimento"
                  name={wedding.reception_venue_name}
                  address={wedding.reception_venue_address}
                  time={wedding.reception_start_time}
                />
              )}
              {!wedding.ceremony_venue_address && !wedding.reception_venue_address && wedding.location && (
                <AddressBlock title="Location" name={null} address={wedding.location} time={null} />
              )}
            </div>
            {wedding.logistical_notes && (
              <div className="mt-5 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs uppercase tracking-wide text-amber-800 font-semibold mb-1">
                  Note logistiche
                </p>
                <p className="text-sm text-amber-900 whitespace-pre-line">{wedding.logistical_notes}</p>
              </div>
            )}
          </Card>
        )}

        {tokenRow.show_vendor_contacts && contacts.length > 0 && (
          <Card className="p-6">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-5 text-slate-900">
              <Phone className="w-5 h-5 text-slate-700" />
              Contatti chiave
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              I recapiti telefonici verranno forniti direttamente dalla coppia o dal wedding planner in prossimità dell'evento.
            </p>
          </Card>
        )}

        {tokenRow.show_operational_numbers && ops && (
          <Card className="p-6">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-5 text-slate-900">
              <Hash className="w-5 h-5 text-slate-700" />
              Numeri operativi (confermati)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBlock icon={UsersIcon} label="Adulti" value={ops.adults} />
              <StatBlock icon={UsersIcon} label="Bambini" value={ops.children} />
              <StatBlock icon={Wrench} label="Staff" value={ops.staff} />
              <StatBlock icon={Hash} label="Totale coperti" value={ops.total} highlight />
              <StatBlock icon={Utensils} label="Con esigenze alimentari" value={ops.dietary_count} />
              <StatBlock icon={Hash} label="Tavoli" value={ops.tables} />
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-slate-400 pt-4">
          Link riservato ai fornitori — non condividere pubblicamente. Creato con WedsApp.
        </p>
      </div>
    </div>
  );
}

function AddressBlock({
  title,
  name,
  address,
  time,
}: {
  title: string;
  name: string | null;
  address: string;
  time: string | null;
}) {
  const maps = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  return (
    <a
      href={maps}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-400 transition"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{title}</p>
        {time && <span className="text-xs font-mono text-slate-700">{time.slice(0, 5)}</span>}
      </div>
      {name && <p className="font-medium text-slate-900 mt-1">{name}</p>}
      <p className="text-sm text-slate-600 mt-0.5">{address}</p>
    </a>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        highlight ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 border-slate-200"
      }`}
    >
      <Icon className={`w-4 h-4 mb-2 ${highlight ? "text-slate-300" : "text-slate-500"}`} />
      <p className={`text-2xl font-bold ${highlight ? "text-white" : "text-slate-900"}`}>{value}</p>
      <p className={`text-xs ${highlight ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
    </div>
  );
}
