import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type State = "loading" | "confirm" | "success" | "already" | "invalid" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        );
        const j = await r.json();
        if (j.valid) setState("confirm");
        else if (j.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch { setState("error"); }
    })();
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setBusy(false);
    if (error) setState("error");
    else if (data?.success) setState("success");
    else if (data?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <h1 className="text-2xl font-bold">Cancella iscrizione</h1>
        {state === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
        {state === "confirm" && (
          <>
            <p className="text-muted-foreground">
              Confermi di non voler più ricevere email da WedsApp a questo indirizzo?
            </p>
            <Button onClick={confirm} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conferma cancellazione"}
            </Button>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <p>Iscrizione cancellata. Non riceverai più email da WedsApp.</p>
          </>
        )}
        {state === "already" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Questo indirizzo è già stato cancellato.</p>
          </>
        )}
        {(state === "invalid" || state === "error") && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <p className="text-muted-foreground">
              {state === "invalid" ? "Link non valido o scaduto." : "Si è verificato un errore. Riprova più tardi."}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
