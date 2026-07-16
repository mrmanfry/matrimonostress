import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { GuestsProgressView } from "@/components/progress/GuestsProgressView";
import { VendorsProgressView } from "@/components/progress/VendorsProgressView";

export interface ProgressTokenRow {
  wedding_id: string;
  expires_at: string;
  is_active: boolean;
  audience: "guests" | "vendors";
  label: string | null;
  show_countdown: boolean;
  show_timeline: boolean;
  show_location: boolean;
  show_dress_code: boolean;
  show_memories_qr: boolean;
  show_addresses: boolean;
  show_vendor_contacts: boolean;
  show_operational_numbers: boolean;
}

const ProgressPublic = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tokenRow, setTokenRow] = useState<ProgressTokenRow | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) {
        setError(true);
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from("progress_tokens")
        .select(
          "wedding_id, expires_at, is_active, audience, label, show_countdown, show_timeline, show_location, show_dress_code, show_memories_qr, show_addresses, show_vendor_contacts, show_operational_numbers"
        )
        .eq("token", token)
        .maybeSingle();

      if (err || !data || !data.is_active || new Date(data.expires_at) < new Date()) {
        setError(true);
        setLoading(false);
        return;
      }
      setTokenRow(data as ProgressTokenRow);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-purple-50">
        <div className="text-center">
          <Heart className="w-16 h-16 text-rose-400 fill-rose-400 mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error || !tokenRow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-purple-50 p-4">
        <Card className="p-8 max-w-md text-center">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Link non valido</h1>
          <p className="text-muted-foreground">Questo link potrebbe essere scaduto o non più attivo.</p>
        </Card>
      </div>
    );
  }

  return tokenRow.audience === "vendors" ? (
    <VendorsProgressView tokenRow={tokenRow} />
  ) : (
    <GuestsProgressView tokenRow={tokenRow} />
  );
};

export default ProgressPublic;
