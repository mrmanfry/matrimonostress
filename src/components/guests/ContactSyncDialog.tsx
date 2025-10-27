import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, X, Search, Smartphone, QrCode } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

interface ContactSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  onSyncComplete: () => void;
}

interface ContactMatch {
  id: string;
  guest_id: string;
  guest_name: string;
  contact_name: string;
  contact_phone: string;
  confidence_score: number;
  status: string;
}

export function ContactSyncDialog({ 
  open, 
  onOpenChange,
  weddingId,
  onSyncComplete 
}: ContactSyncDialogProps) {
  const [step, setStep] = useState<'qr' | 'review'>('qr');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [polling, setPolling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !token) {
      generateToken();
    }
  }, [open]);

  useEffect(() => {
    if (open && token && step === 'qr') {
      startPolling();
    }
    return () => setPolling(false);
  }, [open, token, step]);

  const generateToken = async () => {
    setLoading(true);
    setToken(''); // Reset token
    try {
      const { data, error } = await supabase.functions.invoke('generate-sync-token', {
        body: { weddingId }
      });

      if (error) throw error;
      setToken(data.token);
      toast({
        title: "Nuovo QR Code generato",
        description: "Scansiona il nuovo codice QR con il tuo telefono.",
      });
    } catch (error: any) {
      console.error('Error generating token:', error);
      toast({
        title: "Errore",
        description: "Impossibile generare il codice QR. Riprova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    setPolling(true);
    const interval = setInterval(async () => {
      await checkForMatches();
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPolling(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  };

  const checkForMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_matches_temp')
        .select(`
          id,
          guest_id,
          contact_name,
          contact_phone,
          confidence_score,
          status,
          guests (first_name, last_name)
        `)
        .eq('wedding_id', weddingId)
        .eq('status', 'pending');

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedMatches = data.map((m: any) => ({
          id: m.id,
          guest_id: m.guest_id,
          guest_name: `${m.guests.first_name} ${m.guests.last_name}`,
          contact_name: m.contact_name,
          contact_phone: m.contact_phone,
          confidence_score: m.confidence_score,
          status: m.status,
        }));
        setMatches(formattedMatches);
        setStep('review');
        setPolling(false);
      }
    } catch (error) {
      console.error('Error checking matches:', error);
    }
  };

  const handleApproveMatch = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    try {
      // Update guest with phone number
      const { error: updateError } = await supabase
        .from('guests')
        .update({ phone: match.contact_phone })
        .eq('id', match.guest_id);

      if (updateError) throw updateError;

      // Mark match as approved
      await supabase
        .from('contact_matches_temp')
        .update({ status: 'approved' })
        .eq('id', matchId);

      setMatches(prev => prev.filter(m => m.id !== matchId));
      
      toast({
        title: "Abbinamento confermato",
        description: `${match.contact_phone} associato a ${match.guest_name}`,
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSkipMatch = async (matchId: string) => {
    try {
      await supabase
        .from('contact_matches_temp')
        .update({ status: 'skipped' })
        .eq('id', matchId);

      setMatches(prev => prev.filter(m => m.id !== matchId));
    } catch (error) {
      console.error('Error skipping match:', error);
    }
  };

  const handleApproveAll = async () => {
    setLoading(true);
    try {
      for (const match of matches) {
        await handleApproveMatch(match.id);
      }
      
      toast({
        title: "Abbinamenti salvati",
        description: `${matches.length} contatti sono stati aggiunti.`,
      });
      
      onSyncComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error approving all:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncUrl = `${window.location.origin}/sync/${token}`;

  const filteredMatches = matches.filter(m =>
    m.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.contact_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 'qr' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Sincronizza Contatti
              </DialogTitle>
              <DialogDescription>
                Scansiona questo codice con la fotocamera del tuo telefono per sincronizzare i contatti.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-8">
              {loading || !token ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generazione codice QR...</p>
                </div>
              ) : (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                    <QRCodeSVG value={syncUrl} size={256} />
                  </div>
                  
                  <div className="text-center space-y-4">
                    <p className="text-sm font-medium">Codice valido per 10 minuti</p>
                    {polling && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        In attesa di sincronizzazione...
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateToken}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generazione...
                        </>
                      ) : (
                        "🔄 Genera Nuovo QR Code"
                      )}
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md">
                    <p className="text-sm font-semibold mb-2">📱 Sto già sul telefono?</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Apri questo link direttamente:
                    </p>
                    <code className="text-xs bg-background p-2 rounded block break-all">
                      {syncUrl}
                    </code>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Abbina i Contatti Trovati</DialogTitle>
              <DialogDescription>
                Revisiona e conferma gli abbinamenti proposti. Puoi approvarli, saltarli o modificarli.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca invitato o contatto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {filteredMatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun abbinamento da revisionare
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{match.guest_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {match.contact_name} • {match.contact_phone}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {match.confidence_score}%
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApproveMatch(match.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approva
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSkipMatch(match.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Salta
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {matches.length > 0 && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleApproveAll}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      `Approva Tutti (${matches.length})`
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Chiudi
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}