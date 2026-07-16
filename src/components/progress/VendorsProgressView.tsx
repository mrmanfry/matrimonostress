import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Hash, User as UserIcon, Utensils, Users as UsersIcon, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { ProgressTokenRow } from "@/pages/ProgressPublic";

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
}

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string | null;
  location: string | null;
}

interface Contact { name: string; role: string; }

interface OpNumbers {
  adults: number;
  children: number;
  staff: number;
  total: number;
  dietary_count: number;
  tables: number;
}

export function VendorsProgressView({ tokenRow, token }: { tokenRow: ProgressTokenRow; token: string }) {
  const [wedding, setWedding] = useState<WeddingInfo | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [ops, setOps] = useState<OpNumbers | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("progress-public-data", {
        body: { token },
      });
      if (error || !data) return;
      if (data.wedding) setWedding(data.wedding);
      if (Array.isArray(data.events)) setEvents(data.events);
      if (Array.isArray(data.contacts)) setContacts(data.contacts);
      if (data.ops) setOps(data.ops);
    })();
  }, [token]);

  const headerDate = useMemo(() => {
    if (!wedding?.date) return "";
    return format(new Date(wedding.date), "EEEE d MMMM yyyy", { locale: it });
  }, [wedding?.date]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-400/20 to-purple-400/20" />
        <div className="relative max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="flex justify-center mb-5">
            <div className="p-3 bg-white/80 backdrop-blur rounded-full shadow-lg">
              <ClipboardList className="w-8 h-8 text-rose-500" />
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-rose-500 font-semibold mb-2">
            Briefing operativo fornitori
          </p>
          {wedding && (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                {wedding.partner1} <span className="text-rose-500">&</span> {wedding.partner2}
              </h1>
              <p className="text-base text-gray-600 mt-2">
                {headerDate}
                {wedding.ceremony_start_time && ` · inizio cerimonia ${wedding.ceremony_start_time.slice(0, 5)}`}
              </p>
            </>
          )}
          {tokenRow.label && (
            <p className="text-sm text-gray-500 mt-3 italic">Riferimento: {tokenRow.label}</p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
        {tokenRow.show_timeline && events.length > 0 && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-5 text-gray-800">
              <Calendar className="w-5 h-5 text-rose-500" />
              Timeline operativa
            </h3>
            <div className="space-y-5">
              {events.map((e, i) => (
                <div key={e.id} className="relative pl-8">
                  {i < events.length - 1 && (
                    <div className="absolute left-[11px] top-7 bottom-[-1rem] w-0.5 bg-rose-200" />
                  )}
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center shadow-md">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-lg font-bold text-rose-500 font-mono">{e.time.slice(0, 5)}</span>
                    <h4 className="text-base font-semibold text-gray-800">{e.title}</h4>
                  </div>
                  {e.description && <p className="text-sm text-gray-600">{e.description}</p>}
                  {e.location && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {e.location}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {tokenRow.show_addresses && wedding && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800">
              <MapPin className="w-5 h-5 text-rose-500" />
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
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800">
              <UserIcon className="w-5 h-5 text-rose-500" />
              Contatti chiave
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-rose-50 to-purple-50 border border-rose-100">
                  <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{c.name}</p>
                    <p className="text-xs text-rose-500 uppercase tracking-wide font-semibold">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4 italic">
              I recapiti telefonici verranno forniti direttamente dalla coppia o dal wedding planner in prossimità dell'evento.
            </p>
          </Card>
        )}

        {tokenRow.show_operational_numbers && ops && (
          <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800">
              <Hash className="w-5 h-5 text-rose-500" />
              Numeri operativi <span className="text-sm font-normal text-gray-500">(confermati)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBlock icon={UsersIcon} label="Adulti" value={ops.adults} />
              <StatBlock icon={UsersIcon} label="Bambini" value={ops.children} />
              <StatBlock icon={ClipboardList} label="Staff" value={ops.staff} />
              <StatBlock icon={Hash} label="Totale coperti" value={ops.total} highlight />
              <StatBlock icon={Utensils} label="Esigenze alimentari" value={ops.dietary_count} />
              <StatBlock icon={Hash} label="Tavoli" value={ops.tables} />
            </div>
          </Card>
        )}

        <p className="text-center text-sm text-gray-400 pt-4">
          Link riservato ai fornitori — non condividere pubblicamente.
          <br />
          Creato con <span className="font-medium">WedsApp</span>
        </p>
      </div>
    </div>
  );
}

function AddressBlock({
  title, name, address, time,
}: { title: string; name: string | null; address: string; time: string | null }) {
  const maps = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  return (
    <a
      href={maps}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg bg-gradient-to-br from-rose-50 to-purple-50 border border-rose-100 hover:shadow-md transition"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-rose-500 font-semibold">{title}</p>
        {time && <span className="text-xs font-mono text-gray-700">{time.slice(0, 5)}</span>}
      </div>
      {name && <p className="font-medium text-gray-800 mt-1">{name}</p>}
      <p className="text-sm text-gray-600 mt-0.5">{address}</p>
    </a>
  );
}

function StatBlock({
  icon: Icon, label, value, highlight,
}: { icon: any; label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={
        highlight
          ? "p-4 rounded-lg border border-rose-200 bg-gradient-to-br from-rose-500 to-purple-500 text-white shadow-md"
          : "p-4 rounded-lg border border-rose-100 bg-gradient-to-br from-rose-50 to-purple-50"
      }
    >
      <Icon className={`w-4 h-4 mb-2 ${highlight ? "text-white/80" : "text-rose-500"}`} />
      <p className={`text-2xl font-bold ${highlight ? "text-white" : "text-gray-800"}`}>{value}</p>
      <p className={`text-xs ${highlight ? "text-white/90" : "text-gray-500"}`}>{label}</p>
    </div>
  );
}
