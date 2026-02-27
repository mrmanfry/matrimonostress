import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SaveTheDateView } from "@/components/rsvp/SaveTheDateView";
import { FormalInviteView } from "@/components/rsvp/FormalInviteView";
import type { FAQItem, GiftInfo } from "@/components/settings/CampaignCard";

interface RSVPPublicProps {
  forceStdMode?: boolean;
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

interface RSVPConfig {
  hero_image_url: string | null;
  welcome_title: string;
  welcome_text: string;
  deadline_date: string | null;
}

interface Theme {
  font_family: "serif" | "sans" | "elegant";
  primary_color: string;
  show_countdown: boolean;
}

interface RSVPData {
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    alias?: string | null;
  };
  party: {
    id: string;
    name: string;
    status: string;
    members: GuestMember[];
    lastEditorName: string | null;
    lastUpdatedAt: string | null;
  };
  wedding: {
    couple: string;
    date: string;
    location?: string | null;
    ceremonyStartTime?: string | null;
    timezone?: string | null;
    ceremonyVenueName?: string | null;
    ceremonyVenueAddress?: string | null;
    receptionVenueName?: string | null;
    receptionVenueAddress?: string | null;
    receptionStartTime?: string | null;
    ceremonyImageUrl?: string | null;
    receptionImageUrl?: string | null;
  };
  config: RSVPConfig;
  theme?: Theme | null;
  stdConfig?: {
    hero_image_url: string | null;
    welcome_title: string;
    welcome_text: string;
  } | null;
  faqs?: FAQItem[];
  giftInfo?: GiftInfo | null;
  isReadOnly: boolean;
}

export default function RSVPPublic({ forceStdMode }: RSVPPublicProps) {
  // Support both old format (/rsvp/:token) and new format (/:coupleSlug/rsvp/:token)
  const { token, coupleSlug } = useParams<{ token: string; coupleSlug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rsvpData, setRsvpData] = useState<RSVPData | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [memberData, setMemberData] = useState<Record<string, {
    rsvpStatus: 'pending' | 'confirmed' | 'declined';
    isVegetarian: boolean;
    isVegan: boolean;
    dietaryRestrictions: string;
    hasPlusOne: boolean;
    plusOneName: string;
    plusOneMenu: string;
  }>>({});
  
  // Check if this is Save The Date mode (via prop OR query param)
  const isStdMode = forceStdMode || searchParams.get('mode') === 'std';

  useEffect(() => {
    if (!token) {
      navigate("/404");
      return;
    }

    // Handle preview mode
    if (token === "preview") {
      setIsPreview(true);
      fetchPreviewData();
      return;
    }

    fetchRSVPData();
  }, [token, navigate]);

  const fetchPreviewData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Devi essere loggato per vedere l'anteprima");
        navigate("/auth");
        return;
      }

      const { data: wedding, error } = await supabase
        .from("weddings")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();

      if (error || !wedding) {
        toast.error("Matrimonio non trovato");
        navigate("/app/settings");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const campaignsRaw = wedding.campaigns_config as any;
      const campaignSource = isStdMode ? campaignsRaw?.save_the_date : campaignsRaw?.rsvp;
      const themeRaw = campaignsRaw?.theme;

      const config: RSVPConfig = {
        hero_image_url: campaignSource?.hero_image_url || null,
        welcome_title: campaignSource?.welcome_title || (isStdMode ? "Save The Date!" : "Benvenuti al nostro Matrimonio"),
        welcome_text: campaignSource?.welcome_text || (isStdMode ? "Segnati questa data!" : "Non vediamo l'ora di festeggiare con voi!"),
        deadline_date: campaignSource?.deadline_date || null,
      };

      const theme: Theme | null = themeRaw ? {
        font_family: themeRaw.font_family || "elegant",
        primary_color: themeRaw.primary_color || "#8B5E3C",
        show_countdown: themeRaw.show_countdown ?? true,
      } : null;

      const stdConfig = isStdMode ? {
        hero_image_url: campaignsRaw?.save_the_date?.hero_image_url || null,
        welcome_title: campaignsRaw?.save_the_date?.welcome_title || "Save The Date!",
        welcome_text: campaignsRaw?.save_the_date?.welcome_text || "Segnati questa data!",
      } : null;

      const faqs: FAQItem[] = campaignsRaw?.rsvp?.faqs || [];
      const giftInfo: GiftInfo | null = campaignsRaw?.rsvp?.gift_info || null;

      const demoData: RSVPData = {
        guest: {
          id: "demo-guest",
          firstName: "Mario",
          lastName: "Rossi",
        },
        party: {
          id: "demo-party",
          name: "Famiglia Rossi",
          status: "In attesa",
          members: [
            {
              id: "demo-member-1",
              first_name: "Mario",
              last_name: "Rossi",
              rsvp_status: "pending",
              menu_choice: null,
              dietary_restrictions: null,
              is_child: false,
              allow_plus_one: true,
              plus_one_name: null,
              plus_one_menu: null,
            },
            {
              id: "demo-member-2",
              first_name: "Laura",
              last_name: "Rossi",
              rsvp_status: "pending",
              menu_choice: null,
              dietary_restrictions: null,
              is_child: false,
              allow_plus_one: false,
              plus_one_name: null,
              plus_one_menu: null,
            },
            {
              id: "demo-member-3",
              first_name: "Tommaso",
              last_name: "Rossi",
              rsvp_status: "pending",
              menu_choice: null,
              dietary_restrictions: null,
              is_child: true,
              allow_plus_one: false,
              plus_one_name: null,
              plus_one_menu: null,
            },
          ],
          lastEditorName: null,
          lastUpdatedAt: null,
        },
        wedding: {
          couple: `${wedding.partner1_name} & ${wedding.partner2_name}`,
          date: wedding.wedding_date,
          location: wedding.location,
          ceremonyStartTime: wedding.ceremony_start_time,
          timezone: wedding.timezone,
          ceremonyVenueName: wedding.ceremony_venue_name,
          ceremonyVenueAddress: wedding.ceremony_venue_address,
          receptionVenueName: wedding.reception_venue_name,
          receptionVenueAddress: wedding.reception_venue_address,
          receptionStartTime: wedding.reception_start_time,
          ceremonyImageUrl: campaignsRaw?.rsvp?.ceremony_image_url || null,
          receptionImageUrl: campaignsRaw?.rsvp?.reception_image_url || null,
        },
        config,
        theme,
        stdConfig,
        faqs,
        giftInfo,
        isReadOnly: false,
      };

      setRsvpData(demoData);

      const initialMemberData: Record<string, any> = {};
      demoData.party.members.forEach((member) => {
        initialMemberData[member.id] = {
          rsvpStatus: 'pending',
          isVegetarian: false,
          isVegan: false,
          dietaryRestrictions: "",
          hasPlusOne: false,
          plusOneName: "",
          plusOneMenu: "",
        };
      });
      setMemberData(initialMemberData);
    } catch (error) {
      console.error("Error fetching preview data:", error);
      toast.error("Errore nel caricamento anteprima");
    } finally {
      setLoading(false);
    }
  };

  const fetchRSVPData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("rsvp-handler", {
        body: { action: "fetch", token },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error === "Token not found" ? "Link RSVP non valido o scaduto" : "Errore nel caricamento");
        navigate("/404");
        return;
      }

      setRsvpData(data);

      const initialMemberData: Record<string, any> = {};
      data.party.members.forEach((member: GuestMember) => {
        initialMemberData[member.id] = {
          rsvpStatus: member.rsvp_status === 'confirmed' ? 'confirmed' : 
                      member.rsvp_status === 'declined' ? 'declined' : 'pending',
          isVegetarian: member.menu_choice === "vegetariano",
          isVegan: member.menu_choice === "vegano",
          dietaryRestrictions: member.dietary_restrictions || "",
          hasPlusOne: !!member.plus_one_name,
          plusOneName: member.plus_one_name || "",
          plusOneMenu: member.plus_one_menu || "",
        };
      });
      setMemberData(initialMemberData);
    } catch (error) {
      console.error("Error fetching RSVP data:", error);
      toast.error("Errore nel caricamento dell'invito");
      navigate("/404");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberStatusChange = (memberId: string, status: 'confirmed' | 'declined') => {
    setMemberData(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        rsvpStatus: status,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block submission in preview mode
    if (isPreview) {
      toast.info("Questa è solo un'anteprima. Il form non può essere inviato.");
      return;
    }
    if (rsvpData?.isReadOnly) {
      toast.error("Il termine per rispondere è scaduto");
      return;
    }

    // Check if everyone has responded
    const pendingMembers = rsvpData!.party.members.filter(
      m => memberData[m.id]?.rsvpStatus === 'pending'
    );
    if (pendingMembers.length > 0) {
      toast.warning(`Per favore indica se ${pendingMembers[0].first_name} ci sarà o meno.`);
      return;
    }

    setSubmitting(true);

    try {
      const members = rsvpData!.party.members.map((member) => {
        const data = memberData[member.id];
        let menuChoice: string | null = null;
        if (data?.isVegan) menuChoice = "vegano";
        else if (data?.isVegetarian) menuChoice = "vegetariano";
        
        return {
          id: member.id,
          rsvpStatus: data?.rsvpStatus || "pending",
          menuChoice,
          dietaryRestrictions: data?.rsvpStatus === 'confirmed' ? data?.dietaryRestrictions || null : null,
          plusOneName: member.allow_plus_one && data?.hasPlusOne && data?.rsvpStatus === 'confirmed' ? data.plusOneName : null,
          plusOneMenu: member.allow_plus_one && data?.hasPlusOne && data?.rsvpStatus === 'confirmed' ? data.plusOneMenu : null,
        };
      });

      // Derive party status from individual responses
      const hasConfirmed = members.some(m => m.rsvpStatus === 'confirmed');
      const allDeclined = members.every(m => m.rsvpStatus === 'declined');
      const partyStatus = allDeclined ? "Rifiutato" : hasConfirmed ? "Confermato" : "In attesa";

      const { data, error } = await supabase.functions.invoke("rsvp-handler", {
        method: "POST",
        body: JSON.stringify({
          token,
          partyStatus,
          members,
        }),
      });

      if (error) throw error;

      if (data.error) {
        if (data.error === "RSVP deadline passed") {
          toast.error("Il termine per rispondere è scaduto");
        } else {
          toast.error("Errore nell'invio della risposta");
        }
        return;
      }

      setSubmitted(true);
      toast.success("Risposta RSVP inviata con successo!");
    } catch (error) {
      console.error("Error submitting RSVP:", error);
      toast.error("Errore nell'invio della risposta");
    } finally {
      setSubmitting(false);
    }
  };

  // Handler for Save The Date response
  const handleStdResponse = async (response: 'likely_yes' | 'likely_no' | 'unsure') => {
    const { error } = await supabase.functions.invoke("rsvp-handler", {
      body: { action: "save-std-response", token, stdResponse: response },
    });
    if (error) throw error;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rsvpData) return null;

  // Render Save The Date view if mode=std
  if (isStdMode) {
    // Use STD-specific config directly - edge function now properly separates configs
    // stdConfig already has correct defaults from the edge function
    const stdHeroImage = rsvpData.stdConfig?.hero_image_url || null;
    const stdWelcomeTitle = rsvpData.stdConfig?.welcome_title || "Save The Date!";
    const stdWelcomeText = rsvpData.stdConfig?.welcome_text || "Segnati questa data!";

    return (
      <SaveTheDateView
        coupleName={rsvpData.wedding.couple}
        weddingDate={rsvpData.wedding.date}
        weddingLocation={rsvpData.wedding.location || undefined}
        ceremonyStartTime={rsvpData.wedding.ceremonyStartTime || undefined}
        timezone={rsvpData.wedding.timezone || undefined}
        guestFirstName={rsvpData.guest.firstName}
        guestLastName={rsvpData.guest.lastName}
        guestAlias={rsvpData.guest.alias}
        heroImageUrl={stdHeroImage}
        welcomeTitle={stdWelcomeTitle}
        welcomeText={stdWelcomeText}
        isReadOnly={rsvpData.isReadOnly}
        theme={rsvpData.theme}
        onSubmitResponse={handleStdResponse}
      />
    );
  }

  const { config, isReadOnly, party } = rsvpData;
  
  // Detect if this is a single guest (virtual party)
  const isSingleGuest = party.id.startsWith('virtual-');

  // Create a wrapper function for handleSubmit that matches the expected signature
  const handleFormSubmit = async () => {
    // Synthetic event for compatibility
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(syntheticEvent);
  };

  // Render the immersive formal invite view
  return (
    <FormalInviteView
      coupleName={rsvpData.wedding.couple}
      weddingDate={rsvpData.wedding.date}
      timezone={rsvpData.wedding.timezone || undefined}
      ceremonyVenueName={rsvpData.wedding.ceremonyVenueName}
      ceremonyVenueAddress={rsvpData.wedding.ceremonyVenueAddress}
      ceremonyStartTime={rsvpData.wedding.ceremonyStartTime}
      ceremonyImageUrl={rsvpData.wedding.ceremonyImageUrl}
      receptionVenueName={rsvpData.wedding.receptionVenueName}
      receptionVenueAddress={rsvpData.wedding.receptionVenueAddress}
      receptionStartTime={rsvpData.wedding.receptionStartTime}
      receptionImageUrl={rsvpData.wedding.receptionImageUrl}
      guestFirstName={rsvpData.guest.firstName}
      guestAlias={rsvpData.guest.alias}
      isSingleGuest={isSingleGuest}
      partyName={party.name}
      members={party.members}
      heroImageUrl={config.hero_image_url}
      welcomeTitle={config.welcome_title}
      welcomeText={config.welcome_text}
      theme={rsvpData.theme}
      faqs={rsvpData.faqs}
      giftInfo={rsvpData.giftInfo || undefined}
      isReadOnly={isReadOnly}
      isPreview={isPreview}
      deadlineDate={config.deadline_date}
      memberData={memberData}
      onMemberDataChange={setMemberData}
      onSubmit={handleFormSubmit}
      submitting={submitting}
      submitted={submitted}
    />
  );
}
