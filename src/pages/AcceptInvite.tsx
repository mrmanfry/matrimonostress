import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Heart, CheckCircle, XCircle } from "lucide-react";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [wedding, setWedding] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        setError("Token invito mancante");
        setLoading(false);
        return;
      }

      try {
        // Verifica che il token sia valido e non scaduto
        const { data: inviteData, error: inviteError } = await supabase
          .from("wedding_invitations")
          .select("*, weddings(*)")
          .eq("token", token)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .single();

        if (inviteError || !inviteData) {
          setError("Invito non valido o scaduto");
          setLoading(false);
          return;
        }

        setInvitation(inviteData);
        setWedding(inviteData.weddings);
        setLoading(false);
      } catch (err: any) {
        console.error("Error validating invitation:", err);
        setError("Errore durante la validazione dell'invito");
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleAccept = async () => {
    // Verifica se l'utente è autenticato
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      toast({
        title: "Autenticazione richiesta",
        description: "Devi effettuare il login o registrarti per accettare l'invito",
        variant: "destructive",
      });
      navigate(`/auth?redirect=/accept-invite?token=${token}`);
      return;
    }

    setAccepting(true);

    try {
      // Verifica che l'email dell'utente corrisponda all'email dell'invito
      if (session.user.email !== invitation.email) {
        toast({
          title: "Email non corrispondente",
          description: "Questo invito è destinato a un'altra email. Effettua il login con l'email corretta.",
          variant: "destructive",
        });
        setAccepting(false);
        return;
      }

      // Inserisci il ruolo nella tabella user_roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: session.user.id,
          wedding_id: invitation.wedding_id,
          role: invitation.role,
        });

      if (roleError) {
        throw roleError;
      }

      // Aggiorna lo status dell'invito
      const { error: updateError } = await supabase
        .from("wedding_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Invito accettato!",
        description: "Benvenuto nel team di pianificazione del matrimonio!",
      });

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        title: "Errore",
        description: "Impossibile accettare l'invito. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifica dell'invito in corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <CardTitle>Invito Non Valido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <CardTitle className="text-2xl">Invito al Matrimonio</CardTitle>
          <CardDescription>
            Sei stato invitato a collaborare alla pianificazione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Matrimonio di</p>
              <p className="text-xl font-semibold text-primary">
                {wedding?.partner1_name} & {wedding?.partner2_name}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-medium">
                {new Date(wedding?.wedding_date).toLocaleDateString("it-IT", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Il tuo ruolo</p>
              <p className="font-medium">
                {invitation?.role === "co_planner" && "Co-Planner"}
                {invitation?.role === "manager" && "Manager"}
                {invitation?.role === "guest" && "Ospite"}
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⏰ Questo invito scade il{" "}
              {new Date(invitation?.expires_at).toLocaleDateString("it-IT")}
            </p>
          </div>

          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full"
            size="lg"
          >
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accettazione in corso...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accetta Invito
              </>
            )}
          </Button>

          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full"
          >
            Rifiuta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
