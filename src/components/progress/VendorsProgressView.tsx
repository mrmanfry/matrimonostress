import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar, MapPin, Hash, User as UserIcon, Utensils,
  Users as UsersIcon, ClipboardList, Eye, EyeOff, Phone, Mail, AlertCircle,
} from "lucide-react";
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

interface VendorContact {
  category: string | null;
  name: string;
  phone: string | null;
  email: string | null;
}

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
  const [vendorContacts, setVendorContacts] = useState<VendorContact[]>([]);
  const [ops, setOps] = useState<OpNumbers | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("progress-public-data", {
        body: { token },
      });
      if (error || !data) return;
      if (data.wedding) setWedding(data.wedding);
      if (Array.isArray(data.events)) setEvents(data.events);
      if (Array.isArray(data.contacts)) setContacts(data.contacts);
      if (Array.isArray(data.vendorContacts)) setVendorContacts(data.vendorContacts);
      if (data.ops) setOps(data.ops);
    })();
  }, [token]);

  const headerDate = useMemo(() => {
    if (!wedding?.date) return "";
    return format(new Date(wedding.date), "EEEE d MMMM yyyy", { locale: it });
  }, [wedding?.date]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-14 pb-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground mb-4">
          Briefing fornitori
        </p>
        {wedding && (
          <>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground leading-tight">
              {wedding.partner1} <span className="text-muted-foreground italic">&</span> {wedding.partner2}
            </h1>
            <p className="text-sm text-muted-foreground mt-3">
              {headerDate}
              {wedding.ceremony_start_time && ` · ore ${wedding.ceremony_start_time.slice(0, 5)}`}
            </p>
          </>
        )}
        {tokenRow.label && (
          <p className="text-xs text-muted-foreground/70 mt-3 italic">Riferimento: {tokenRow.label}</p>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-5">
        {tokenRow.show_operational_numbers && ops && (
          <Card className="p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Numeri operativi confermati
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

        {tokenRow.show_timeline && events.length > 0 && (
          <Card className="p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-5 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Timeline operativa
            </h3>
            <div className="space-y-4">
              {events.map((e, i) => (
                <div key={e.id} className="relative pl-6 pb-4 border-l border-border last:border-transparent last:pb-0">
                  <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-primary" />
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-mono text-primary tabular-nums">{e.time.slice(0, 5)}</span>
                    <h4 className="text-sm font-medium text-foreground">{e.title}</h4>
                  </div>
                  {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
                  {e.location && (
                    <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
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
          <Card className="p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location e indirizzi
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
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
              <div className="mt-5 p-4 rounded-md bg-amber-50 border border-amber-100">
                <p className="text-[11px] uppercase tracking-wider text-amber-800 font-medium mb-1">
                  Note logistiche
                </p>
                <p className="text-sm text-amber-900 whitespace-pre-line">{wedding.logistical_notes}</p>
              </div>
            )}
          </Card>
        )}

        {tokenRow.show_vendor_contacts && (contacts.length > 0 || vendorContacts.length > 0) && (
          <Card className="p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Contatti dell'evento
            </h3>

            {contacts.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2 mb-5">
                {contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {vendorContacts.length > 0 && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Rubrica fornitori</p>
                    <p className="text-xs text-muted-foreground">
                      {vendorContacts.length} {vendorContacts.length === 1 ? "fornitore confermato" : "fornitori confermati"} per l'evento
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealed(v => !v)}
                    className="gap-2"
                  >
                    {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {revealed ? "Nascondi" : "Mostra"}
                  </Button>
                </div>

                {revealed ? (
                  <>
                    <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                      {vendorContacts.map((v, i) => (
                        <div key={i} className="p-3 bg-card">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{v.name}</p>
                            {v.category && (
                              <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">
                                {v.category}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            {v.phone && (
                              <a href={`tel:${v.phone}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                {v.phone}
                              </a>
                            )}
                            {v.email && (
                              <a href={`mailto:${v.email}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 break-all">
                                <Mail className="w-3.5 h-3.5" />
                                {v.email}
                              </a>
                            )}
                            {!v.phone && !v.email && (
                              <span className="text-xs text-muted-foreground italic">Nessun recapito registrato</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p>Recapiti riservati. Non condividere né diffondere pubblicamente.</p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    I recapiti sono nascosti. Clicca "Mostra" per visualizzarli.
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground/70 pt-6">
          Link riservato — creato con <span className="font-medium">WedsApp</span>
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
      className="block p-4 rounded-md bg-muted/40 hover:bg-muted border border-border transition"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{title}</p>
        {time && <span className="text-xs font-mono text-foreground tabular-nums">{time.slice(0, 5)}</span>}
      </div>
      {name && <p className="text-sm font-medium text-foreground mt-1.5">{name}</p>}
      <p className="text-sm text-muted-foreground mt-0.5">{address}</p>
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
          ? "p-4 rounded-md border border-primary/20 bg-primary/5"
          : "p-4 rounded-md border border-border bg-card"
      }
    >
      <Icon className={`w-4 h-4 mb-2 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      <p className="text-2xl font-serif text-foreground tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
