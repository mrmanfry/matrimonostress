import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface GuestMember {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  is_child: boolean;
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
  };
  wedding: {
    couple: string;
    date: string;
  };
}

export default function RSVPPublic() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rsvpData, setRsvpData] = useState<RSVPData | null>(null);
  const [partyStatus, setPartyStatus] = useState<string>("Confermato");
  const [memberData, setMemberData] = useState<Record<string, { menuChoice: string; dietaryRestrictions: string; rsvpStatus: string }>>({});

  useEffect(() => {
    if (!token) {
      navigate("/404");
      return;
    }

    const fetchRSVPData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("rsvp-handler", {
          method: "GET",
          body: { token },
        });

        if (error) throw error;

        if (data.error) {
          toast.error(data.error === "Token not found" ? "Link RSVP non valido o scaduto" : "Errore nel caricamento");
          navigate("/404");
          return;
        }

        setRsvpData(data);
        setPartyStatus(data.party.status);

        const initialMemberData: Record<string, any> = {};
        data.party.members.forEach((member: GuestMember) => {
          initialMemberData[member.id] = {
            menuChoice: member.menu_choice || "",
            dietaryRestrictions: member.dietary_restrictions || "",
            rsvpStatus: member.rsvp_status || "pending",
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

    fetchRSVPData();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const members = rsvpData!.party.members.map((member) => ({
        id: member.id,
        rsvpStatus: memberData[member.id]?.rsvpStatus || "pending",
        menuChoice: memberData[member.id]?.menuChoice || null,
        dietaryRestrictions: memberData[member.id]?.dietaryRestrictions || null,
      }));

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
        toast.error("Errore nell'invio della risposta");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rsvpData) return null;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Grazie per la tua risposta!</CardTitle>
            <CardDescription>
              La tua conferma è stata registrata con successo.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
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
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Ciao {rsvpData.guest.firstName}! 👋
                </h3>
                <p className="text-muted-foreground mb-6">
                  Conferma la tua presenza per il nostro grande giorno
                </p>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    {rsvpData.party.name}
                  </Label>
                  <RadioGroup value={partyStatus} onValueChange={setPartyStatus}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="Confermato" id="confirmed" />
                      <Label htmlFor="confirmed" className="flex-1 cursor-pointer">
                        <CheckCircle className="w-4 h-4 inline mr-2 text-primary" />
                        Ci saremo!
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="Rifiutato" id="declined" />
                      <Label htmlFor="declined" className="flex-1 cursor-pointer">
                        <XCircle className="w-4 h-4 inline mr-2 text-destructive" />
                        Non potremo partecipare
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {partyStatus === "Confermato" && (
                <div className="space-y-6 border-t pt-6">
                  <h4 className="font-semibold">Preferenze individuali</h4>
                  {rsvpData.party.members.map((member) => (
                    <div key={member.id} className="space-y-4 p-4 rounded-lg bg-accent/20 border border-border">
                      <div className="font-medium">
                        {member.first_name} {member.last_name}
                        {member.is_child && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Bambino
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`menu-${member.id}`} className="text-sm">
                          Scelta menù
                        </Label>
                        <Input
                          id={`menu-${member.id}`}
                          placeholder="Es: Menu carne, Menu pesce, Menu vegetariano"
                          value={memberData[member.id]?.menuChoice || ""}
                          onChange={(e) =>
                            setMemberData({
                              ...memberData,
                              [member.id]: {
                                ...memberData[member.id],
                                menuChoice: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`dietary-${member.id}`} className="text-sm">
                          Allergie o intolleranze
                        </Label>
                        <Textarea
                          id={`dietary-${member.id}`}
                          placeholder="Specificare eventuali allergie o restrizioni alimentari"
                          value={memberData[member.id]?.dietaryRestrictions || ""}
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
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Invia risposta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
