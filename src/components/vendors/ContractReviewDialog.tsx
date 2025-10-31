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

interface ContractReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: {
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
  onSaveComplete,
}: ContractReviewDialogProps) => {
  const [payments, setPayments] = useState<Payment[]>(
    analysis.pagamenti.map((p) => ({ ...p, enabled: true }))
  );
  const [keyPoints, setKeyPoints] = useState(analysis.punti_chiave);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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
            pagamenti: payments.filter((p) => p.enabled),
            punti_chiave: keyPoints,
          })),
        }])
        .select()
        .single();

      if (contractError) throw contractError;

      toast({
        title: "Contratto salvato",
        description: "Il contratto è stato analizzato e salvato. Crea le spese associate per generare i pagamenti.",
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
            <div className="space-y-4">
              <h3 className="font-semibold">Piano di Pagamento Proposto</h3>
              {payments.map((payment, index) => (
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

            <div className="space-y-4">
              <h3 className="font-semibold">Punti Chiave Trovati</h3>
              
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