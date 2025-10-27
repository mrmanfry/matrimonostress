import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export default function ContactSync() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setTokenValid(false);
        toast({
          title: "Token non valido",
          description: "Questo link è scaduto o non valido. Genera un nuovo QR code.",
          variant: "destructive",
        });
      } else {
        setTokenValid(true);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSelectContacts = async () => {
    setLoading(true);
    try {
      // Check if Contact Picker API is supported
      if (!('contacts' in navigator && 'ContactsManager' in window)) {
        toast({
          title: "API non supportata",
          description: "Su iPhone, la sincronizzazione automatica non è ancora supportata. Usa l'import CSV.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const props = ['name', 'tel'];
      const opts = { multiple: true };
      
      // @ts-ignore - Contact Picker API
      const contactsList = await navigator.contacts.select(props, opts);
      
      const formattedContacts = contactsList.map((contact: any) => ({
        name: contact.name?.[0] || '',
        phone: contact.tel?.[0] || '',
      })).filter((c: any) => c.name && c.phone);

      setContacts(formattedContacts);

      if (formattedContacts.length === 0) {
        toast({
          title: "Nessun contatto selezionato",
          description: "Seleziona almeno un contatto per continuare.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Upload contacts for matching
      await uploadContacts(formattedContacts);
    } catch (error) {
      console.error('Contact selection error:', error);
      toast({
        title: "Errore",
        description: "Impossibile accedere ai contatti. Verifica i permessi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadContacts = async (contactsList: any[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('match-contacts', {
        body: { token, contacts: contactsList }
      });

      if (error) throw error;

      setUploadComplete(true);
      toast({
        title: "Sincronizzazione completata!",
        description: `${data.matchesCount} contatti sono stati abbinati. Torna al computer per revisionarli.`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il caricamento dei contatti.",
        variant: "destructive",
      });
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="p-8 text-center max-w-md">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Validazione token...</p>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Token non valido</h1>
          <p className="text-muted-foreground mb-4">
            Questo link è scaduto o non è valido.
          </p>
          <p className="text-sm text-muted-foreground">
            Torna al computer e genera un nuovo QR code.
          </p>
        </Card>
      </div>
    );
  }

  if (uploadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h1 className="text-2xl font-bold mb-2">Fatto!</h1>
          <p className="text-muted-foreground mb-4">
            I tuoi contatti sono stati sincronizzati con successo.
          </p>
          <p className="text-sm text-muted-foreground">
            Torna al tuo computer per revisionare e confermare gli abbinamenti.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="p-8 max-w-md">
        <h1 className="text-2xl font-bold mb-4">Sincronizza Contatti</h1>
        <p className="text-muted-foreground mb-6">
          Seleziona i contatti dalla tua rubrica che vuoi associare ai tuoi invitati. 
          Verranno caricati solo quelli che scegli esplicitamente.
        </p>
        
        <div className="bg-muted/50 p-4 rounded-lg mb-6 text-sm">
          <p className="font-semibold mb-2">🔒 Privacy garantita</p>
          <p className="text-muted-foreground">
            I dati saranno usati solo per inviare messaggi WhatsApp per tuo conto 
            e non verranno salvati dopo la conferma.
          </p>
        </div>

        <Button 
          onClick={handleSelectContacts}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Caricamento...
            </>
          ) : (
            "Seleziona Contatti dalla Rubrica"
          )}
        </Button>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Su iPhone? Se la sincronizzazione automatica non funziona, 
          puoi importare i tuoi contatti tramite file CSV.
        </p>
      </Card>
    </div>
  );
}