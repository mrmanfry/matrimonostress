import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

interface Payment {
  descrizione: string;
  importo_tipo: "assoluto" | "percentuale";
  importo_valore: number;
  data_tipo: "assoluta" | "relativa_evento" | "trigger_testo";
  data_valore: string | number;
  enabled?: boolean;
}

interface KeyPoints {
  penali_cancellazione?: string;
  costi_occulti?: string;
  piano_b?: string;
  responsabilita_extra?: string;
}

interface VendorRegistry {
  ragione_sociale?: string;
  partita_iva_cf?: string;
  indirizzo_sede_legale?: string;
  email?: string;
  telefono?: string;
  iban?: string;
  intestatario_conto?: string;
}

interface ContractReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: {
    anagrafica_fornitore?: VendorRegistry;
    pagamenti: Payment[];
    punti_chiave: KeyPoints;
  };
  fileInfo: {
    fileName: string;
    filePath: string;
    fileType: string;
  };
  vendorId: string;
  weddingId: string;
  weddingDate?: string;
  totalContract?: number;
  currentVendor?: {
    name?: string;
    ragione_sociale?: string;
    partita_iva_cf?: string;
    indirizzo_sede_legale?: string;
    email?: string;
    phone?: string;
    iban?: string;
    intestatario_conto?: string;
  };
  onSaveComplete: () => void;
}

export const ContractReviewDialog = ({
  open,
  onOpenChange,
  analysis,
  fileInfo,
  vendorId,
  weddingId,
  weddingDate,
  totalContract,
  currentVendor,
  onSaveComplete,
}: ContractReviewDialogProps) => {
  const [payments, setPayments] = useState<Payment[]>(
    analysis.pagamenti.map((p) => ({ ...p, enabled: true }))
  );
  const [keyPoints, setKeyPoints] = useState(analysis.punti_chiave);
  const [vendorUpdates, setVendorUpdates] = useState<Record<string, boolean>>({});
  const [useVendorRegistry, setUseVendorRegistry] = useState(true);
  const [usePayments, setUsePayments] = useState(true);
  const [useKeyPoints, setUseKeyPoints] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Initialize vendor updates - all checked by default
  const extractedVendor = analysis.anagrafica_fornitore || {};
  const vendorFields = [
    { key: 'ragione_sociale', label: 'Ragione Sociale', current: currentVendor?.ragione_sociale || currentVendor?.name, extracted: extractedVendor.ragione_sociale },
    { key: 'partita_iva_cf', label: 'P.IVA / CF', current: currentVendor?.partita_iva_cf, extracted: extractedVendor.partita_iva_cf },
    { key: 'indirizzo_sede_legale', label: 'Indirizzo Sede', current: currentVendor?.indirizzo_sede_legale, extracted: extractedVendor.indirizzo_sede_legale },
    { key: 'email', label: 'Email', current: currentVendor?.email, extracted: extractedVendor.email },
    { key: 'telefono', label: 'Telefono', current: currentVendor?.phone, extracted: extractedVendor.telefono },
    { key: 'iban', label: 'IBAN', current: currentVendor?.iban, extracted: extractedVendor.iban },
    { key: 'intestatario_conto', label: 'Intestatario Conto', current: currentVendor?.intestatario_conto, extracted: extractedVendor.intestatario_conto },
  ].filter(field => field.extracted); // Only show fields that were extracted

  const calculateDate = (payment: Payment): string => {
    if (payment.data_tipo === "assoluta") {
      return payment.data_valore as string;
    } else if (payment.data_tipo === "relativa_evento" && weddingDate) {
      const days = payment.data_valore as number;
      const weddingDateObj = new Date(weddingDate);
      const calculatedDate = addDays(weddingDateObj, days);
      return format(calculatedDate, "yyyy-MM-dd");
    } else {
      return payment.data_valore as string;
    }
  };

  const calculateAmount = (payment: Payment): number => {
    if (payment.importo_tipo === "assoluto") {
      return payment.importo_valore;
    } else if (payment.importo_tipo === "percentuale" && totalContract) {
      return (totalContract * payment.importo_valore) / 100;
    }
    return 0;
  };

  const togglePayment = (index: number) => {
    setPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const updatePayment = (index: number, field: string, value: any) => {
    setPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Update vendor registry ONLY if enabled and if any fields are selected
      if (useVendorRegistry) {
        const selectedVendorUpdates = vendorFields.reduce((acc, field) => {
          if (vendorUpdates[field.key] !== false && field.extracted) {
            acc[field.key] = field.extracted;
          }
          return acc;
        }, {} as Record<string, any>);

        if (Object.keys(selectedVendorUpdates).length > 0) {
          // Special handling for phone field (stored as 'phone' in vendors table)
          if (selectedVendorUpdates.telefono) {
            selectedVendorUpdates.phone = selectedVendorUpdates.telefono;
            delete selectedVendorUpdates.telefono;
          }

          const { error: vendorError } = await supabase
            .from("vendors")
            .update(selectedVendorUpdates)
            .eq("id", vendorId);

          if (vendorError) throw vendorError;
        }
      }

      // Save contract analysis
      const { data: contractData, error: contractError } = await supabase
        .from("vendor_contracts")
        .insert([{
          vendor_id: vendorId,
          wedding_id: weddingId,
          file_path: fileInfo.filePath,
          file_name: fileInfo.fileName,
          file_type: fileInfo.fileType,
          ai_analysis: JSON.parse(JSON.stringify({
            anagrafica_fornitore: useVendorRegistry ? extractedVendor : null,
            pagamenti: usePayments ? payments.filter((p) => p.enabled) : [],
            punti_chiave: useKeyPoints ? keyPoints : {},
          })),
        }])
        .select()
        .single();

      if (contractError) throw contractError;

      toast({
        title: "Contratto salvato",
        description: "Anagrafica fornitore aggiornata e contratto analizzato con successo.",
      });

      onSaveComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving contract:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante il salvataggio",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conferma i dati estratti dal contratto</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column: Document viewer (placeholder for now) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30 min-h-[500px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="font-medium">{fileInfo.fileName}</p>
                <p className="text-sm mt-2">Anteprima documento non disponibile</p>
              </div>
            </div>
          </div>

          {/* Right column: Extracted data form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Vendor Registry Updates */}
            {vendorFields.length > 0 && (
              <div className="space-y-4 pb-6 border-b">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="use-vendor-registry"
                    checked={useVendorRegistry}
                    onChange={(e) => setUseVendorRegistry(e.target.checked)}
                    className="h-5 w-5"
                  />
                  <label htmlFor="use-vendor-registry" className="font-semibold text-lg cursor-pointer">
                    1. Aggiornamento Anagrafica Fornitore
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {useVendorRegistry 
                    ? "Conferma i dati estratti dal contratto per aggiornare la scheda fornitore"
                    : "⚠️ Se i dati sono inventati o errati, disabilita questa sezione"}
                </p>
                {useVendorRegistry && (
                  <div className="space-y-3">
                    {vendorFields.map((field) => (
                      <div key={field.key} className="flex items-start gap-3 p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          checked={vendorUpdates[field.key] !== false}
                          onChange={(e) => setVendorUpdates({ ...vendorUpdates, [field.key]: e.target.checked })}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{field.label}</div>
                          <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">Attuale:</span>
                              <div className="truncate">{field.current || <span className="italic text-muted-foreground">(vuoto)</span>}</div>
                            </div>
                            <div>
                              <span className="text-green-600 font-medium">Trovato:</span>
                              <div className="truncate font-medium">{field.extracted}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Payment Plan */}
            <div className="space-y-4 pb-6 border-b">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use-payments"
                  checked={usePayments}
                  onChange={(e) => setUsePayments(e.target.checked)}
                  className="h-5 w-5"
                />
                <label htmlFor="use-payments" className="font-semibold text-lg cursor-pointer">
                  2. Piano di Pagamento Proposto
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                {usePayments
                  ? `${payments.length} rata/e trovate. Disabilita le rate errate o inventate.`
                  : "⚠️ Se le rate sono inventate o incomplete, disabilita questa sezione"}
              </p>
              {usePayments && payments.map((payment, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 space-y-3 ${
                    !payment.enabled ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Rata {index + 1}</Label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={payment.enabled ? "default" : "outline"}
                        onClick={() => togglePayment(index)}
                      >
                        {payment.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrizione</Label>
                    <Input
                      value={payment.descrizione}
                      onChange={(e) => updatePayment(index, "descrizione", e.target.value)}
                      disabled={!payment.enabled}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Importo</Label>
                      <Input
                        type="number"
                        value={payment.importo_valore}
                        onChange={(e) => updatePayment(index, "importo_valore", parseFloat(e.target.value))}
                        disabled={!payment.enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={payment.importo_tipo}
                        onValueChange={(value) => updatePayment(index, "importo_tipo", value)}
                        disabled={!payment.enabled}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assoluto">€ Fisso</SelectItem>
                          <SelectItem value="percentuale">% Totale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Scadenza</Label>
                    <Input
                      value={calculateDate(payment)}
                      onChange={(e) => {
                        updatePayment(index, "data_tipo", "assoluta");
                        updatePayment(index, "data_valore", e.target.value);
                      }}
                      disabled={!payment.enabled}
                    />
                  </div>

                  {payment.enabled && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      Importo calcolato: €{calculateAmount(payment).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Section 3: Key Points */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use-key-points"
                  checked={useKeyPoints}
                  onChange={(e) => setUseKeyPoints(e.target.checked)}
                  className="h-5 w-5"
                />
                <label htmlFor="use-key-points" className="font-semibold text-lg cursor-pointer">
                  3. Punti Chiave e Rischi
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                {useKeyPoints
                  ? "Rivedi le clausole estratte e modifica se necessario"
                  : "⚠️ Se i punti chiave sono inventati o errati, disabilita questa sezione"}
              </p>
              
              {useKeyPoints && (
                <>
                  {keyPoints.penali_cancellazione && (
                <div className="space-y-2">
                  <Label>Penali Cancellazione</Label>
                  <Textarea
                    value={keyPoints.penali_cancellazione}
                    onChange={(e) =>
                      setKeyPoints({ ...keyPoints, penali_cancellazione: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              )}

              {keyPoints.costi_occulti && (
                <div className="space-y-2">
                  <Label>Costi Extra</Label>
                  <Textarea
                    value={keyPoints.costi_occulti}
                    onChange={(e) =>
                      setKeyPoints({ ...keyPoints, costi_occulti: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              )}

              {keyPoints.piano_b && (
                <div className="space-y-2">
                  <Label>Piano B</Label>
                  <Textarea
                    value={keyPoints.piano_b}
                    onChange={(e) => setKeyPoints({ ...keyPoints, piano_b: e.target.value })}
                    rows={2}
                  />
                </div>
              )}

              {keyPoints.responsabilita_extra && (
                <div className="space-y-2">
                  <Label>Responsabilità Extra</Label>
                  <Textarea
                    value={keyPoints.responsabilita_extra}
                    onChange={(e) =>
                      setKeyPoints({ ...keyPoints, responsabilita_extra: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvataggio..." : "Approva e Salva Dati"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};