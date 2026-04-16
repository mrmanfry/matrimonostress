import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, MapPin, Church, PartyPopper, ChevronDown, Check, X, UserPlus, Utensils, Leaf, Copy, Gift, ExternalLink, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { isConfirmed, isDeclined, isPending } from "@/lib/rsvpHelpers";
import type { FAQItem, GiftInfo } from "@/components/settings/CampaignCard";

interface Theme {
  font_family: "serif" | "sans" | "elegant";
  primary_color: string;
  show_countdown: boolean;
}

interface GuestMember {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  is_child: boolean;
  allow_plus_one: boolean;
  plus_one_name: string | null;
  plus_one_menu: string | null;
}

interface MemberData {
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  isVegetarian: boolean;
  isVegan: boolean;
  dietaryRestrictions: string;
  hasPlusOne: boolean;
  plusOneName: string;
  plusOneMenu: string;
}

interface DietaryOptionConfig {
  id: string;
  label: string;
  enabled: boolean;
  is_custom: boolean;
}

interface CateringConfigProp {
  dietary_options: DietaryOptionConfig[];
  show_allergy_field: boolean;
  show_dietary_notes: boolean;
}

interface FormalInviteViewProps {
  // Couple and date
  coupleName: string;
  weddingDate: string;
  timezone?: string;

  // Ceremony
  ceremonyVenueName?: string | null;
  ceremonyVenueAddress?: string | null;
  ceremonyStartTime?: string | null;
  ceremonyImageUrl?: string | null;

  // Reception
  receptionVenueName?: string | null;
  receptionVenueAddress?: string | null;
  receptionStartTime?: string | null;
  receptionImageUrl?: string | null;

  // Guest
  guestFirstName: string;
  guestAlias?: string | null;
  isSingleGuest: boolean;
  partyName?: string;
  members: GuestMember[];

  // Visual config
  heroImageUrl?: string | null;
  welcomeTitle?: string;
  welcomeText?: string;
  theme?: Theme | null;

  // New sections
  faqs?: FAQItem[];
  giftInfo?: GiftInfo;

  // Catering config (dynamic dietary options)
  cateringConfig?: CateringConfigProp | null;

  // State
  isReadOnly?: boolean;
  isPreview?: boolean;
  deadlineDate?: string | null;

  // Callbacks
  memberData: Record<string, MemberData>;
  onMemberDataChange: (data: Record<string, MemberData>) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  submitted: boolean;
}

// Format time for display (HH:MM -> "ORE HH:MM")
const formatTime = (time: string | null | undefined): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  return `ORE ${hours}:${minutes || "00"}`;
};

// Generate Google Maps link
const getMapsLink = (address: string): string => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

export function FormalInviteView({
  coupleName,
  weddingDate,
  timezone = "Europe/Rome",
  ceremonyVenueName,
  ceremonyVenueAddress,
  ceremonyStartTime,
  ceremonyImageUrl,
  receptionVenueName,
  receptionVenueAddress,
  receptionStartTime,
  receptionImageUrl,
  guestFirstName,
  guestAlias,
  isSingleGuest,
  partyName,
  members,
  heroImageUrl,
  welcomeTitle,
  welcomeText,
  theme,
  faqs,
  giftInfo,
  cateringConfig,
  isReadOnly,
  isPreview,
  deadlineDate,
  memberData,
  onMemberDataChange,
  onSubmit,
  submitting,
  submitted
}: FormalInviteViewProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // Parse couple names for display
  const names = coupleName.split(/\s*[&e]\s*/i);
  const name1 = names[0]?.trim() || "";
  const name2 = names[1]?.trim() || "";

  // Format date in the wedding's timezone
  const eventDate = new Date(weddingDate + "T12:00:00");
  const tz = timezone || "Europe/Rome";

  const dayOfWeek = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    timeZone: tz
  }).format(eventDate);

  const dayNumber = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    timeZone: tz
  }).format(eventDate);

  const monthName = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone: tz
  }).format(eventDate);

  const year = new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    timeZone: tz
  }).format(eventDate);

  // Theme-based styling
  const primaryColor = theme?.primary_color || "#D4AF37";
  const displayName = guestAlias || guestFirstName;

  // Scroll to RSVP section
  const scrollToRsvp = () => {
    document.getElementById("rsvp-section")?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle member status change
  const handleMemberStatusChange = (memberId: string, status: 'confirmed' | 'declined') => {
    onMemberDataChange({
      ...memberData,
      [memberId]: {
        ...memberData[memberId],
        rsvpStatus: status
      }
    });
  };

  // Handle member data field change
  const handleMemberFieldChange = (memberId: string, field: keyof MemberData, value: any) => {
    onMemberDataChange({
      ...memberData,
      [memberId]: {
        ...memberData[memberId],
        [field]: value
      }
    });
  };

  // Build a thank-you name that reflects the whole nucleus when applicable
  const buildThankYouName = () => {
    if (isSingleGuest || !members || members.length <= 1) return displayName;
    if (partyName?.toLowerCase().startsWith('famiglia')) return partyName;
    const names = members.map((m) => m.first_name).filter(Boolean);
    if (names.length === 0) return displayName;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} e ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
  };

  // Success state after submission
  if (submitted) {
    const confirmedCount = members.filter(
      (m) => memberData[m.id]?.rsvpStatus === 'confirmed'
    ).length;

    return (
      <div
        className="relative min-h-screen flex flex-col items-center justify-center"
        style={{
          backgroundImage: heroImageUrl ?
          `url(${heroImageUrl})` :
          `linear-gradient(135deg, ${primaryColor}33 0%, ${primaryColor}11 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>

        {/* Dark Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: heroImageUrl ?
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)' :
            'transparent'
          }} />


        <div className="relative z-10 text-center text-white px-6 py-12 max-w-md mx-auto space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Check className="w-10 h-10" style={{ color: primaryColor }} />
          </div>
          
          <h1 className="font-cormorant text-4xl sm:text-5xl font-light">
            Grazie {buildThankYouName()}!
          </h1>

          <p className="text-white/80 text-lg">
            {confirmedCount > 0 ?
            `${confirmedCount} person${confirmedCount > 1 ? 'e' : 'a'} confermat${confirmedCount > 1 ? 'e' : 'a'}.` :
            "La tua risposta è stata registrata."}
          </p>
          
          <p className="text-white/60 capitalize">
            Ci vediamo {dayOfWeek} {dayNumber} {monthName} {year}!
          </p>

          {/* Couple Names */}
          <div className="pt-8">
            <p className="font-cormorant text-2xl font-light" style={{ color: primaryColor }}>
              {name1} & {name2}
            </p>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="relative">
      {/* Preview Banner */}
      {isPreview &&
      <div
        className="text-white text-center py-2 px-4 font-medium text-sm sticky top-0 z-50"
        style={{ backgroundColor: primaryColor }}>

          ⚠️ ANTEPRIMA - Questa è una simulazione
        </div>
      }

      {/* Sticky Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-md">
        <button
          onClick={scrollToRsvp}
          className="px-4 py-2 text-sm text-white/90 hover:text-white transition-colors border border-white/30 rounded-full">

          RSVP
        </button>
        <div className="w-10" /> {/* Spacer for balance */}
      </nav>

      {/* HERO SECTION - Full Screen */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center"
        style={{
          backgroundImage: heroImageUrl ?
          `url(${heroImageUrl})` :
          `linear-gradient(135deg, ${primaryColor}33 0%, ${primaryColor}11 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>

        {/* Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: heroImageUrl ?
            'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)' :
            'transparent'
          }} />


        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-6 space-y-6">
          {/* Couple Names */}
          <h1 className="font-cormorant text-5xl sm:text-6xl md:text-7xl font-light leading-tight">
            {name1}
            <span
              className="block font-playfair text-3xl sm:text-4xl italic my-2"
              style={{ color: primaryColor }}>

              e
            </span>
            {name2}
          </h1>

          {/* Date */}
          <p className="font-cormorant text-2xl sm:text-3xl capitalize">
            {dayOfWeek} {dayNumber} {monthName} {year}
          </p>

          {/* Decorative Flowers */}
          





        </div>
      </section>

      {/* CEREMONY SECTION */}
      {(ceremonyVenueName || ceremonyVenueAddress) &&
      <section className="py-16 px-6 bg-stone-50 text-center">
          <div className="max-w-lg mx-auto space-y-6">
            <h2
            className="font-cormorant text-3xl sm:text-4xl font-light"
            style={{ color: primaryColor }}>

              La Cerimonia
            </h2>

            <div className="flex justify-center">
              {ceremonyImageUrl ?
            <img src={ceremonyImageUrl} alt={ceremonyVenueName || "Cerimonia"} className="w-full max-w-md max-h-64 object-contain rounded-lg bg-stone-50" /> :

            <Church className="w-12 h-12 text-stone-400" />
            }
            </div>

            {ceremonyVenueName &&
          <h3 className="font-cormorant text-2xl font-semibold text-stone-800">
                {ceremonyVenueName}
              </h3>
          }

            {ceremonyVenueAddress &&
          <p className="text-stone-600 whitespace-pre-line">
                {ceremonyVenueAddress}
              </p>
          }

            {ceremonyStartTime &&
          <p
            className="text-xl font-medium"
            style={{ color: primaryColor }}>

                {formatTime(ceremonyStartTime)}
              </p>
          }

            {ceremonyVenueAddress &&
          <a
            href={getMapsLink(ceremonyVenueAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2 border rounded-full text-sm transition-colors hover:bg-stone-100"
            style={{ borderColor: primaryColor, color: primaryColor }}>

                <MapPin className="w-4 h-4" />
                Apri in Maps
              </a>
          }
          </div>
        </section>
      }

      {/* RECEPTION SECTION */}
      {(receptionVenueName || receptionVenueAddress) &&
      <section className="py-16 px-6 bg-white text-center">
          <div className="max-w-lg mx-auto space-y-6">
            <h2
            className="font-cormorant text-3xl sm:text-4xl font-light"
            style={{ color: primaryColor }}>

              Il Ricevimento
            </h2>

            <div className="flex justify-center">
              {receptionImageUrl ?
            <img src={receptionImageUrl} alt={receptionVenueName || "Ricevimento"} className="w-full max-w-md aspect-[16/10] object-cover object-center rounded-lg" /> :

            <PartyPopper className="w-12 h-12 text-stone-400" />
            }
            </div>

            {receptionVenueName &&
          <h3 className="font-cormorant text-2xl font-semibold text-stone-800">
                {receptionVenueName}
              </h3>
          }

            {receptionVenueAddress &&
          <p className="text-stone-600 whitespace-pre-line">
                {receptionVenueAddress}
              </p>
          }

            {receptionStartTime &&
          <p
            className="text-xl font-medium"
            style={{ color: primaryColor }}>

                {formatTime(receptionStartTime)}
              </p>
          }

            {receptionVenueAddress &&
          <a
            href={getMapsLink(receptionVenueAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2 border rounded-full text-sm transition-colors hover:bg-stone-100"
            style={{ borderColor: primaryColor, color: primaryColor }}>

                <MapPin className="w-4 h-4" />
                Apri in Maps
              </a>
          }
          </div>
        </section>
      }

      {/* RSVP SECTION */}
      <section
        id="rsvp-section"
        className="py-16 px-6 bg-stone-50">

        <div className="max-w-lg mx-auto space-y-8">
          {/* Section Header */}
          <div className="text-center space-y-4">
            <h2
              className="font-cormorant text-3xl sm:text-4xl font-light"
              style={{ color: primaryColor }}>

              {welcomeTitle || "Conferma la tua Presenza"}
            </h2>
            
            <p className="text-stone-600">
              {welcomeText || `Ciao ${displayName}! Per motivi organizzativi ti preghiamo di confermare la tua presenza.`}
            </p>

            {deadlineDate &&
            <p className="text-sm text-stone-500">
                Rispondi entro il {new Date(deadlineDate).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
              </p>
            }
          </div>

          {/* Read-only Warning */}
          {isReadOnly &&
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-700 text-sm">
                Il termine per rispondere è scaduto. Le risposte non possono più essere modificate.
              </p>
            </div>
          }

          {/* Member Cards */}
          <div className="space-y-4">
            {members.map((member) => {
              const data = memberData[member.id];
              const isExpanded = expandedMember === member.id || data?.rsvpStatus === 'confirmed';
              const isConfirmedStatus = data?.rsvpStatus === 'confirmed';
              const isDeclinedStatus = data?.rsvpStatus === 'declined';

              return (
                <div
                  key={member.id}
                  className={cn(
                    "bg-white rounded-xl shadow-sm border transition-all overflow-hidden",
                    isConfirmedStatus && "border-green-200",
                    isDeclinedStatus && "border-red-200"
                  )}>

                  {/* Member Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                          isConfirmedStatus && "bg-green-500",
                          isDeclinedStatus && "bg-red-400",
                          !isConfirmedStatus && !isDeclinedStatus && "bg-stone-300"
                        )}>

                        {member.first_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-stone-800">
                          {member.first_name} {member.last_name}
                        </p>
                        {member.is_child &&
                        <span className="text-xs text-stone-500">Bambino/a</span>
                        }
                      </div>
                    </div>

                    {/* Status Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => !isReadOnly && handleMemberStatusChange(member.id, 'confirmed')}
                        disabled={isReadOnly}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                          isConfirmedStatus ?
                          "bg-green-500 text-white" :
                          "bg-stone-100 text-stone-600 hover:bg-green-100 hover:text-green-700",
                          isReadOnly && "opacity-50 cursor-not-allowed"
                        )}>

                        <Check className="w-4 h-4" />
                        <span className="hidden sm:inline">Ci sarò</span>
                      </button>
                      <button
                        onClick={() => !isReadOnly && handleMemberStatusChange(member.id, 'declined')}
                        disabled={isReadOnly}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                          isDeclinedStatus ?
                          "bg-red-400 text-white" :
                          "bg-stone-100 text-stone-600 hover:bg-red-100 hover:text-red-700",
                          isReadOnly && "opacity-50 cursor-not-allowed"
                        )}>

                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">Non ci sarò</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details (only for confirmed) */}
                  {isConfirmedStatus &&
                  <div className="px-4 pb-4 space-y-4 border-t border-stone-100 pt-4">
                      {/* Dietary Preferences - Collapsible */}
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors w-full">
                          <Utensils className="w-4 h-4" />
                          Preferenze alimentari
                          <ChevronDown className="w-4 h-4 ml-auto transition-transform [[data-state=open]>&]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3 space-y-3">
                          <div className="flex flex-wrap gap-3">
                            {(() => {
                              const defaultOptions = [
                                { id: "vegetariano", label: "Vegetariano", enabled: true },
                                { id: "vegano", label: "Vegano", enabled: true },
                              ];
                              const options = cateringConfig?.dietary_options?.filter(o => o.enabled) || defaultOptions;
                              return options.map(opt => (
                                <div key={opt.id} className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={
                                      opt.id === "vegetariano" ? (data?.isVegetarian || false) :
                                      opt.id === "vegano" ? (data?.isVegan || false) :
                                      data?.dietaryRestrictions?.includes(opt.label) || false
                                    }
                                    onCheckedChange={(checked) => {
                                      const currentData = memberData[member.id] || { rsvpStatus: 'pending' as const, isVegetarian: false, isVegan: false, dietaryRestrictions: '', hasPlusOne: false, plusOneName: '', plusOneMenu: '' };
                                      const updates: Partial<MemberData> = {};
                                      
                                      if (opt.id === "vegetariano") {
                                        updates.isVegetarian = !!checked;
                                      } else if (opt.id === "vegano") {
                                        updates.isVegan = !!checked;
                                      } else {
                                        const current = currentData.dietaryRestrictions || "";
                                        const items = current.split(",").map(s => s.trim()).filter(Boolean);
                                        if (checked) {
                                          if (!items.includes(opt.label)) items.push(opt.label);
                                        } else {
                                          const idx = items.indexOf(opt.label);
                                          if (idx >= 0) items.splice(idx, 1);
                                        }
                                        updates.dietaryRestrictions = items.join(", ");
                                      }
                                      
                                      const newData = { ...currentData, ...updates };
                                      onMemberDataChange({
                                        ...memberData,
                                        [member.id]: newData as MemberData
                                      });
                                    }}
                                    disabled={isReadOnly}
                                  />
                                  <span className="text-sm text-stone-600">{opt.label}</span>
                                </div>
                              ));
                            })()}
                          </div>
                          
                          {/* Allergies - only show if configured */}
                          {(cateringConfig?.show_allergy_field !== false) && (
                            <Input
                              placeholder="Allergie o intolleranze..."
                              value={data?.dietaryRestrictions || ""}
                              onChange={(e) => handleMemberFieldChange(member.id, 'dietaryRestrictions', e.target.value)}
                              disabled={isReadOnly}
                              className="text-sm"
                            />
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Plus One (if allowed) */}
                      {member.allow_plus_one &&
                    <div className="space-y-3 pt-2 border-t border-stone-100">
                          <div className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                          checked={data?.hasPlusOne || false}
                          onCheckedChange={(checked) => handleMemberFieldChange(member.id, 'hasPlusOne', checked)}
                          disabled={isReadOnly} />

                            <span className="text-sm text-stone-700 flex items-center gap-1">
                              <UserPlus className="w-4 h-4" />
                              Porto un accompagnatore
                            </span>
                          </div>

                          {data?.hasPlusOne &&
                      <div className="space-y-2 pl-6">
                              <Input
                          placeholder="Nome e cognome accompagnatore"
                          value={data?.plusOneName || ""}
                          onChange={(e) => handleMemberFieldChange(member.id, 'plusOneName', e.target.value)}
                          disabled={isReadOnly}
                          className="text-sm" />

                              <Collapsible>
                                <CollapsibleTrigger className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-700 transition-colors">
                                  <Utensils className="w-3 h-3" />
                                  Preferenze alimentari accompagnatore
                                  <ChevronDown className="w-3 h-3 ml-1 transition-transform [[data-state=open]>&]:rotate-180" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-2">
                                  <div className="flex flex-wrap gap-3">
                                    {(() => {
                                      const defaultPlusOneOptions = [
                                        { id: "vegetariano", label: "Vegetariano", enabled: true },
                                        { id: "vegano", label: "Vegano", enabled: true },
                                      ];
                                      const plusOneOptions = cateringConfig?.dietary_options?.filter(o => o.enabled) || defaultPlusOneOptions;
                                      return plusOneOptions.map(opt => (
                                        <div key={opt.id} className="flex items-center gap-2 cursor-pointer text-xs text-stone-500">
                                          <Checkbox
                                            checked={
                                              (data?.plusOneMenu || "").split(",").map(s => s.trim()).filter(Boolean).includes(opt.id)
                                            }
                                            onCheckedChange={(checked) => {
                                              const current = (data?.plusOneMenu || "").split(",").map(s => s.trim()).filter(Boolean);
                                              if (checked) {
                                                if (!current.includes(opt.id)) current.push(opt.id);
                                              } else {
                                                const idx = current.indexOf(opt.id);
                                                if (idx >= 0) current.splice(idx, 1);
                                              }
                                              handleMemberFieldChange(member.id, 'plusOneMenu', current.join(", "));
                                            }}
                                            disabled={isReadOnly} />
                                          {opt.label}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                      }
                        </div>
                    }
                    </div>
                  }
                </div>);

            })}
          </div>

          {/* Submit Button */}
          {!isReadOnly &&
          <Button
            onClick={onSubmit}
            disabled={submitting || members.some((m) => memberData[m.id]?.rsvpStatus === 'pending')}
            className="w-full py-6 text-lg font-medium rounded-full"
            style={{
              backgroundColor: primaryColor,
              color: 'white'
            }}>

              {submitting ?
            <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Invio in corso...
                </> :

            "Conferma Presenza"
            }
            </Button>
          }

          {/* Pending Warning */}
          {members.some((m) => memberData[m.id]?.rsvpStatus === 'pending') &&
          <p className="text-center text-sm text-stone-500">
              Indica per ogni persona se sarà presente o meno
            </p>
          }
        </div>
      </section>

      {/* GIFT INFO / LISTA NOZZE SECTION */}
      {giftInfo?.enabled &&
      <section className="py-16 px-6 bg-white text-center">
          <div className="max-w-lg mx-auto space-y-6">
            <h2
            className="font-cormorant text-3xl sm:text-4xl font-light"
            style={{ color: primaryColor }}>

              La Lista Nozze
            </h2>

            <div className="flex justify-center">
              <Gift className="w-12 h-12 text-stone-400" />
            </div>

            {giftInfo.message &&
          <p className="text-stone-600 leading-relaxed whitespace-pre-line">
                {giftInfo.message}
              </p>
          }

            {giftInfo.couple_names &&
          <p className="font-cormorant text-xl font-semibold text-stone-800">
                {giftInfo.couple_names}
              </p>
          }

            {giftInfo.iban &&
          <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-mono text-stone-700 tracking-wide">
                    {giftInfo.iban}
                  </code>
                  <button
                onClick={() => {
                  navigator.clipboard.writeText(giftInfo.iban);
                  toast.success("IBAN copiato!");
                }}
                className="p-1.5 rounded-md hover:bg-stone-200 transition-colors"
                title="Copia IBAN">

                    <Copy className="w-4 h-4 text-stone-500" />
                  </button>
                </div>
                {giftInfo.bic_swift &&
            <p className="text-xs text-stone-500">
                    Codice BIC/SWIFT: {giftInfo.bic_swift}
                  </p>
            }
                {giftInfo.bank_name &&
            <p className="text-xs text-stone-500">
                    {giftInfo.bank_name}
                  </p>
            }
              </div>
          }

            {giftInfo.registry_url &&
          <a
            href={giftInfo.registry_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2 border rounded-full text-sm transition-colors hover:bg-stone-100"
            style={{ borderColor: primaryColor, color: primaryColor }}>

                <ExternalLink className="w-4 h-4" />
                Vedi Lista Nozze
              </a>
          }
          </div>
        </section>
      }

      {/* FAQ / INFO UTILI SECTION */}
      {faqs && faqs.length > 0 &&
      <section className="py-16 px-6 bg-stone-50">
          <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2
              className="font-cormorant text-3xl sm:text-4xl font-light"
              style={{ color: primaryColor }}>

                Info Utili
              </h2>
              <div className="flex justify-center">
                <HelpCircle className="w-8 h-8 text-stone-400" />
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) =>
            <AccordionItem key={index} value={`faq-${index}`} className="border-stone-200">
                  <AccordionTrigger className="text-left text-stone-800 font-medium hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-stone-600 leading-relaxed whitespace-pre-line">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
            )}
            </Accordion>
          </div>
        </section>
      }

      {/* FOOTER */}
      <footer className="py-12 px-6 bg-stone-900 text-center">
        <div className="max-w-lg mx-auto space-y-4">
          <h3
            className="font-cormorant text-3xl font-light"
            style={{ color: primaryColor }}>

            {name1} & {name2}
          </h3>
          <p className="text-stone-400 capitalize">
            {dayOfWeek} {dayNumber} {monthName} {year}
          </p>
        </div>
      </footer>
    </div>);

}