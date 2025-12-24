import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Leaf, AlertTriangle, Clock, UserPlus, Lock, Check, X, Baby, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { SaveTheDateView } from "@/components/rsvp/SaveTheDateView";

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
  };
  config: RSVPConfig;
  theme?: Theme | null;
  stdConfig?: {
    hero_image_url: string | null;
    welcome_title: string;
    welcome_text: string;
  } | null;
  isReadOnly: boolean;
}

export default function RSVPPublic({ forceStdMode }: RSVPPublicProps) {
  const { token } = useParams<{ token: string }>();
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
      // Get current user's wedding for preview
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Devi essere loggato per vedere l'anteprima");
        navigate("/auth");
        return;
      }

      // Get wedding data
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
      const rawConfig = wedding.rsvp_config as any;
      const config: RSVPConfig = {
        hero_image_url: rawConfig?.hero_image_url || null,
        welcome_title: rawConfig?.welcome_title || "Benvenuti al nostro Matrimonio",
        welcome_text: rawConfig?.welcome_text || "Non vediamo l'ora di festeggiare con voi!",
        deadline_date: rawConfig?.deadline_date || null,
      };

      // Create demo data
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
        },
        config,
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
  if (isStdMode && !isPreview) {
    // Use STD-specific config if available, otherwise fallback to main config
    // Apply .trim() to properly detect empty strings for fallback
    const stdHeroImage = rsvpData.stdConfig?.hero_image_url || rsvpData.config.hero_image_url;
    const stdWelcomeTitle = rsvpData.stdConfig?.welcome_title?.trim() || rsvpData.config.welcome_title;
    const stdWelcomeText = rsvpData.stdConfig?.welcome_text?.trim() || rsvpData.config.welcome_text;

    return (
      <SaveTheDateView
        coupleName={rsvpData.wedding.couple}
        weddingDate={rsvpData.wedding.date}
        weddingLocation={rsvpData.wedding.location || undefined}
        guestFirstName={rsvpData.guest.firstName}
        guestLastName={rsvpData.guest.lastName}
        heroImageUrl={stdHeroImage}
        welcomeTitle={stdWelcomeTitle}
        welcomeText={stdWelcomeText}
        isReadOnly={rsvpData.isReadOnly}
        theme={rsvpData.theme}
        onSubmitResponse={handleStdResponse}
      />
    );
  }

  if (submitted) {
    const confirmedCount = rsvpData.party.members.filter(
      m => memberData[m.id]?.rsvpStatus === 'confirmed'
    ).length;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Grazie per la tua risposta!</CardTitle>
            <CardDescription>
              {confirmedCount > 0 
                ? `${confirmedCount} person${confirmedCount > 1 ? 'e' : 'a'} confermat${confirmedCount > 1 ? 'e' : 'a'}.`
                : "La tua risposta è stata registrata."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ci vediamo il {new Date(rsvpData.wedding.date).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { config, isReadOnly, party } = rsvpData;
  
  // Detect if this is a single guest (virtual party)
  const isSingleGuest = party.id.startsWith('virtual-');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Preview Banner */}
      {isPreview && (
        <div className="bg-yellow-500 text-yellow-950 text-center py-2 px-4 font-medium text-sm sticky top-0 z-50">
          ⚠️ ANTEPRIMA - Questa è una simulazione di come vedranno la pagina i tuoi invitati
        </div>
      )}
      
      {/* Hero Section */}
      {config.hero_image_url && (
        <div className="relative h-48 md:h-64 w-full overflow-hidden">
          <img
            src={config.hero_image_url}
            alt="Wedding"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 -mt-8 relative z-10">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
              {rsvpData.wedding.couple}
            </CardTitle>
            <CardDescription className="text-lg">
              {new Date(rsvpData.wedding.date).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Read-only Alert */}
            {isReadOnly && (
              <Alert variant="destructive" className="mb-6">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Il termine per rispondere è scaduto il{" "}
                  {new Date(config.deadline_date!).toLocaleDateString("it-IT")}.
                  Le risposte non possono più essere modificate.
                </AlertDescription>
              </Alert>
            )}

            {/* Conflict Alert - Only for parties, not singles */}
            {!isSingleGuest && party.lastEditorName && party.lastUpdatedAt && (
              <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                  <strong>{party.lastEditorName}</strong> ha già risposto il{" "}
                  {new Date(party.lastUpdatedAt).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                  })}. Le tue modifiche sovrascriveranno le precedenti risposte.
                </AlertDescription>
              </Alert>
            )}

            {/* Deadline Notice */}
            {config.deadline_date && !isReadOnly && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/50 p-3 rounded-lg">
                <Clock className="w-4 h-4" />
                <span>
                  Rispondi entro il{" "}
                  {new Date(config.deadline_date).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Welcome Message - Different for singles vs parties */}
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold mb-2">
                  {isSingleGuest 
                    ? `Ciao ${rsvpData.guest.firstName}! 👋`
                    : (config.welcome_title || `Ciao ${rsvpData.guest.firstName}!`) + ' 👋'
                  }
                </h3>
                <p className="text-muted-foreground">
                  {config.welcome_text || "Conferma la tua presenza per il nostro grande giorno"}
                </p>
              </div>

              {/* Party Name - Only show for real parties (nuclei), not singles */}
              {!isSingleGuest && (
                <div className="text-center">
                  <Badge variant="outline" className="text-base px-4 py-1">
                    {party.name}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Conferma la presenza di ogni membro del nucleo
                  </p>
                </div>
              )}

              {/* Individual Member Cards */}
              <div className="space-y-4">
                {rsvpData.party.members.map((member) => {
                  const data = memberData[member.id];
                  const isConfirmed = data?.rsvpStatus === 'confirmed';
                  const isDeclined = data?.rsvpStatus === 'declined';
                  
                  return (
                    <Card 
                      key={member.id} 
                      className={cn(
                        "transition-all",
                        isConfirmed && "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20",
                        isDeclined && "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
                      )}
                    >
                      <CardContent className="p-4">
                        {/* Member Header */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">
                              {member.first_name} {member.last_name}
                            </span>
                            {member.is_child && (
                              <Badge variant="outline" className="text-xs">
                                <Baby className="w-3 h-3 mr-1" />
                                Bambino
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex gap-2 bg-muted/50 rounded-lg p-1">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleMemberStatusChange(member.id, 'confirmed')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                              isConfirmed 
                                ? "bg-white dark:bg-green-900 text-green-700 dark:text-green-300 shadow-sm border border-green-200 dark:border-green-800" 
                                : "text-muted-foreground hover:bg-muted",
                              isReadOnly && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Check className="w-4 h-4" />
                            Ci sarò
                          </button>
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleMemberStatusChange(member.id, 'declined')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                              isDeclined 
                                ? "bg-white dark:bg-red-900 text-red-700 dark:text-red-300 shadow-sm border border-red-200 dark:border-red-800" 
                                : "text-muted-foreground hover:bg-muted",
                              isReadOnly && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <X className="w-4 h-4" />
                            Non ci sarò
                          </button>
                        </div>

                        {/* Preferences Section - Only show if confirmed */}
                        {isConfirmed && (
                          <div className="mt-4 pt-4 border-t space-y-4 animate-in slide-in-from-top-2 duration-200">
                            {/* Food Preferences */}
                            <div className="space-y-3">
                              <Label className="text-sm flex items-center gap-2">
                                <Utensils className="w-4 h-4 text-primary" />
                                Preferenze alimentari
                              </Label>
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`vegetarian-${member.id}`}
                                    checked={data?.isVegetarian || false}
                                    disabled={isReadOnly}
                                    onCheckedChange={(checked) => {
                                      setMemberData({
                                        ...memberData,
                                        [member.id]: {
                                          ...memberData[member.id],
                                          isVegetarian: !!checked,
                                          isVegan: checked ? false : memberData[member.id]?.isVegan,
                                        },
                                      });
                                    }}
                                  />
                                  <Label 
                                    htmlFor={`vegetarian-${member.id}`} 
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    Vegetariano/a
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`vegan-${member.id}`}
                                    checked={data?.isVegan || false}
                                    disabled={isReadOnly}
                                    onCheckedChange={(checked) => {
                                      setMemberData({
                                        ...memberData,
                                        [member.id]: {
                                          ...memberData[member.id],
                                          isVegan: !!checked,
                                          isVegetarian: checked ? false : memberData[member.id]?.isVegetarian,
                                        },
                                      });
                                    }}
                                  />
                                  <Label 
                                    htmlFor={`vegan-${member.id}`} 
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    Vegano/a
                                  </Label>
                                </div>
                              </div>
                            </div>

                            {/* Dietary Restrictions */}
                            <div className="space-y-2">
                              <Label htmlFor={`dietary-${member.id}`} className="text-sm">
                                Allergie o intolleranze
                              </Label>
                              <Textarea
                                id={`dietary-${member.id}`}
                                placeholder="Es: Celiaco, intolleranza al lattosio..."
                                value={data?.dietaryRestrictions || ""}
                                disabled={isReadOnly}
                                onChange={(e) =>
                                  setMemberData({
                                    ...memberData,
                                    [member.id]: {
                                      ...memberData[member.id],
                                      dietaryRestrictions: e.target.value,
                                    },
                                  })
                                }
                                rows={2}
                                className="bg-background"
                              />
                            </div>

                            {/* Plus One Section */}
                            {member.allow_plus_one && (
                              <div className="space-y-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-primary" />
                                    Porti un accompagnatore? (+1)
                                  </Label>
                                  <Switch
                                    checked={data?.hasPlusOne || false}
                                    disabled={isReadOnly}
                                    onCheckedChange={(checked) => {
                                      setMemberData({
                                        ...memberData,
                                        [member.id]: {
                                          ...memberData[member.id],
                                          hasPlusOne: checked,
                                          plusOneName: checked ? memberData[member.id]?.plusOneName || "" : "",
                                          plusOneMenu: checked ? memberData[member.id]?.plusOneMenu || "" : "",
                                        },
                                      });
                                    }}
                                  />
                                </div>
                                
                                {data?.hasPlusOne && (
                                  <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                                    <div className="space-y-2">
                                      <Label htmlFor={`plus-one-name-${member.id}`} className="text-sm">
                                        Nome accompagnatore
                                      </Label>
                                      <Input
                                        id={`plus-one-name-${member.id}`}
                                        placeholder="Nome e Cognome"
                                        value={data?.plusOneName || ""}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                          setMemberData({
                                            ...memberData,
                                            [member.id]: {
                                              ...memberData[member.id],
                                              plusOneName: e.target.value,
                                            },
                                          })
                                        }
                                        className="bg-background"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor={`plus-one-menu-${member.id}`} className="text-sm">
                                        Preferenze menu accompagnatore
                                      </Label>
                                      <Input
                                        id={`plus-one-menu-${member.id}`}
                                        placeholder="Es: Vegetariano, allergie..."
                                        value={data?.plusOneMenu || ""}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                          setMemberData({
                                            ...memberData,
                                            [member.id]: {
                                              ...memberData[member.id],
                                              plusOneMenu: e.target.value,
                                            },
                                          })
                                        }
                                        className="bg-background"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={submitting || isReadOnly}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isReadOnly ? "Termine scaduto" : "Invia risposta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
