import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, X, Monitor, FileWarning } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  resolveDisplayName,
  resolveSyncToken,
  type PartyPrintTarget,
} from "@/lib/printNameResolver";
import PrintAudienceStep from "@/components/print/PrintAudienceStep";
import PrintGenerationStep from "@/components/print/PrintGenerationStep";
import QRCanvasEditor, { type QROverlayConfig } from "./QRCanvasEditor";
import { generatePrintPDFs } from "@/lib/printGeneratorEngine";

interface PrintStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

const STEPS = [
  { label: "Carica", number: 1 },
  { label: "Posiziona QR", number: 2 },
  { label: "Destinatari", number: 3 },
];

const DEFAULT_QR_CONFIG: QROverlayConfig = {
  x: 42.5,
  y: 82,
  width: 15,
  color: "#000000",
  quietZone: true,
};

const PrintStudio = ({ open, onOpenChange, weddingId }: PrintStudioProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 — Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [templateType, setTemplateType] = useState<"pdf" | "image">("image");
  const templateBytesRef = useRef<ArrayBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Step 2 — QR config
  const [qrConfig, setQrConfig] = useState<QROverlayConfig>(DEFAULT_QR_CONFIG);

  // Step 3 — Audience
  const [parties, setParties] = useState<PartyPrintTarget[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);

  // Step 4 — Generation
  const [progress, setProgress] = useState(0);
  const [currentName, setCurrentName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Load saved config on open
  useEffect(() => {
    if (open && weddingId) {
      loadSavedConfig();
    }
  }, [open, weddingId]);

  const loadSavedConfig = async () => {
    const { data } = await supabase
      .from("weddings")
      .select("qr_overlay_config, custom_pdf_template_url")
      .eq("id", weddingId)
      .single();

    if (data?.qr_overlay_config) {
      const saved = data.qr_overlay_config as unknown as QROverlayConfig;
      if (saved.x !== undefined) setQrConfig(saved);
    }

    if (data?.custom_pdf_template_url) {
      // Load saved template from storage
      try {
        const { data: fileData } = await supabase.storage
          .from("invitation-designs")
          .download(data.custom_pdf_template_url);
        if (fileData) {
          const isPdf = data.custom_pdf_template_url.endsWith(".pdf");
          setTemplateType(isPdf ? "pdf" : "image");
          templateBytesRef.current = await fileData.arrayBuffer();

          if (isPdf) {
            await rasterizePdfPreview(await fileData.arrayBuffer());
          } else {
            setPreviewUrl(URL.createObjectURL(fileData));
          }
        }
      } catch (err) {
        console.error("Error loading saved template:", err);
      }
    }
  };

  const rasterizePdfPreview = async (buffer: ArrayBuffer) => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      setPreviewUrl(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("Error rasterizing PDF:", err);
      toast({
        title: "Errore di anteprima",
        description: "Non è stato possibile visualizzare l'anteprima del PDF. Prova con un file diverso.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (file: File) => {
    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: "Formato non supportato",
        description: "Carica un file PDF, PNG o JPG. Se hai usato Canva, esporta come PDF.",
        variant: "destructive",
      });
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File troppo grande",
        description: "Il file non può superare i 25MB. Prova a ridurre la risoluzione.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    const buffer = await file.arrayBuffer();
    templateBytesRef.current = buffer;

    if (file.type === "application/pdf") {
      setTemplateType("pdf");
      // Check page count
      try {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(buffer);
        if (doc.getPageCount() > 2) {
          toast({
            title: "PDF troppo lungo",
            description: "Consigliamo di caricare solo la facciata con il QR (max 2 pagine).",
          });
        }
      } catch { /* ignore */ }
      await rasterizePdfPreview(buffer);
    } else {
      setTemplateType("image");
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Save QR config + upload template when advancing from step 2
  const saveConfig = async () => {
    // Save QR config
    await supabase
      .from("weddings")
      .update({ qr_overlay_config: qrConfig as any })
      .eq("id", weddingId);

    // Upload template if it's a new file
    if (uploadedFile) {
      const ext = uploadedFile.type === "application/pdf" ? "pdf" : uploadedFile.type.includes("png") ? "png" : "jpg";
      const path = `${weddingId}/custom_template_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("invitation-designs")
        .upload(path, uploadedFile, { contentType: uploadedFile.type, upsert: true });

      if (!error) {
        await supabase
          .from("weddings")
          .update({ custom_pdf_template_url: path })
          .eq("id", weddingId);
      }
    }
  };

  // Load parties for step 3
  useEffect(() => {
    if (step === 3) {
      saveConfig();
      loadParties();
    }
  }, [step]);

  const loadParties = async () => {
    setLoadingParties(true);
    try {
      const { data: partiesData } = await supabase
        .from("invite_parties")
        .select("id, party_name, rsvp_status, wedding_id")
        .eq("wedding_id", weddingId);

      const { data: guestsData } = await supabase
        .from("guests")
        .select("id, first_name, last_name, is_child, unique_rsvp_token, phone, party_id, is_couple_member, is_staff")
        .eq("wedding_id", weddingId);

      if (!partiesData || !guestsData) return;

      const realGuests = guestsData.filter((g) => !g.is_couple_member && !g.is_staff);
      const targets: PartyPrintTarget[] = [];
      const rsvpMap: Record<string, PartyPrintTarget["rsvpStatus"]> = {
        Confermato: "confirmed",
        Rifiutato: "declined",
      };

      for (const party of partiesData) {
        const members = realGuests.filter((g) => g.party_id === party.id);
        if (members.length === 0) continue;

        targets.push({
          partyId: party.id,
          displayName: resolveDisplayName({ id: party.id, party_name: party.party_name, guests: members }),
          greeting: '',
          guestCount: members.length,
          syncToken: resolveSyncToken(members),
          rsvpStatus: rsvpMap[party.rsvp_status] || "pending",
        });
      }

      setParties(targets);
    } finally {
      setLoadingParties(false);
    }
  };

  // Step 4 — Generate
  useEffect(() => {
    if (step === 4) {
      runGeneration();
    }
  }, [step]);

  const runGeneration = async () => {
    if (!templateBytesRef.current) return;

    const selected = parties.filter((p) => selectedPartyIds.includes(p.partyId));
    if (selected.length === 0) return;

    // Auto-generate missing tokens
    const missingTokenParties = selected.filter((p) => !p.syncToken);
    if (missingTokenParties.length > 0) {
      // Tokens are auto-generated by DB trigger when phone is set
      // For parties without tokens, generate them manually
      for (const party of missingTokenParties) {
        const token = crypto.randomUUID().replace(/-/g, "").toLowerCase();
        // Find a guest in this party to update
        const { data: guests } = await supabase
          .from("guests")
          .select("id")
          .eq("party_id", party.partyId)
          .limit(1);

        if (guests?.[0]) {
          await supabase
            .from("guests")
            .update({ unique_rsvp_token: token })
            .eq("id", guests[0].id);
          party.syncToken = token;
        }
      }
    }

    const { data: wedding } = await supabase
      .from("weddings")
      .select("slug")
      .eq("id", weddingId)
      .single();

    const rsvpBaseUrl = `${window.location.origin}/rsvp/${wedding?.slug || weddingId}`;

    try {
      const result = await generatePrintPDFs(
        templateBytesRef.current,
        templateType,
        qrConfig,
        selected.map((p) => ({ partyId: p.partyId, displayName: p.displayName, syncToken: p.syncToken })),
        rsvpBaseUrl,
        {
          onProgress: (idx, total, name) => {
            setCurrentIndex(idx);
            setCurrentName(name);
            setProgress((idx / total) * 100);
          },
        }
      );

      // Trigger download
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      await new Promise((r) => setTimeout(r, 500));
      setIsSuccess(true);
    } catch (err) {
      console.error("Generation error:", err);
      toast({
        title: "Errore di generazione",
        description: "Non è stato possibile generare i PDF. Riprova con meno invitati.",
        variant: "destructive",
      });
      setStep(3);
    }
  };

  const handleClose = () => {
    if (step === 4 && !isSuccess) return;
    setStep(1);
    setProgress(0);
    setCurrentName("");
    setCurrentIndex(0);
    setIsSuccess(false);
    setSelectedPartyIds([]);
    onOpenChange(false);
  };

  const canAdvance = () => {
    if (step === 1) return !!previewUrl;
    if (step === 2) return true;
    if (step === 3) return selectedPartyIds.length > 0;
    return false;
  };

  // Mobile warning for step 2
  if (isMobile && step === 2) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md p-6 [&>button]:hidden">
          <div className="text-center space-y-4">
            <Monitor className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Usa un computer</h2>
            <p className="text-sm text-muted-foreground">
              Per posizionare il QR code con precisione sul tuo design, usa un computer con schermo più grande.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setStep(1)}>Indietro</Button>
              <Button onClick={() => setStep(3)}>Salta e usa posizione predefinita</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col gap-0 [&>button]:hidden"
        onInteractOutside={(e) => {
          if (step === 4 && !isSuccess) e.preventDefault();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">Carica il tuo Design</h2>
            {step < 4 && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                {STEPS.map((s, idx) => (
                  <div key={s.number} className="flex items-center gap-1.5">
                    {idx > 0 && <span className="text-muted-foreground">→</span>}
                    <span
                      className={
                        step === s.number
                          ? "text-primary font-semibold"
                          : step > s.number
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {s.number}. {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={step === 4 && !isSuccess}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
              <div className="w-full max-w-lg space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Carica il design del tuo invito</h3>
                  <p className="text-sm text-muted-foreground">
                    Carica il PDF o l'immagine finale del tuo invito (da Canva, InDesign o dal tuo designer). Noi aggiungiamo solo il QR code personalizzato.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleInputChange}
                />

                {previewUrl ? (
                  <div className="relative group">
                    <div className="border border-border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center" style={{ maxHeight: "350px" }}>
                      <img src={previewUrl} alt="Preview" className="max-w-full max-h-[350px] object-contain" />
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        Cambia file
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setUploadedFile(null);
                          setPreviewUrl(null);
                          templateBytesRef.current = null;
                        }}
                      >
                        Rimuovi
                      </Button>
                    </div>
                    {uploadedFile && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(1)} MB)
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={`w-full aspect-[3/4] max-h-[350px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors ${
                      isDragOver
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Upload className="w-10 h-10" />
                    <div className="text-center">
                      <p className="font-medium">Trascina qui il file o clicca per sfogliare</p>
                      <p className="text-xs mt-1">PDF, PNG o JPG • Max 25MB • Max 2 pagine</p>
                    </div>
                  </button>
                )}

                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <FileWarning className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Carica il <strong>design finale</strong> del tuo invito. Noi aggiungiamo solo il QR code univoco per ogni nucleo familiare. Non modifichiamo testo, colori o layout.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: QR Canvas */}
          {step === 2 && previewUrl && (
            <QRCanvasEditor
              previewImageUrl={previewUrl}
              config={qrConfig}
              onChange={setQrConfig}
            />
          )}

          {/* Step 3: Audience */}
          {step === 3 && (
            loadingParties ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <PrintAudienceStep
                parties={parties}
                selectedPartyIds={selectedPartyIds}
                onSelectionChange={setSelectedPartyIds}
              />
            )
          )}

          {/* Step 4: Generation */}
          {step === 4 && (
            <PrintGenerationStep
              progress={progress}
              currentName={currentName}
              currentIndex={currentIndex}
              total={selectedPartyIds.length}
              isSuccess={isSuccess}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Indietro
                </Button>
              )}
            </div>
            <Button
              onClick={() => setStep((step + 1) as 2 | 3 | 4)}
              disabled={!canAdvance()}
            >
              {step === 3 ? `Genera ${selectedPartyIds.length} inviti` : "Avanti"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrintStudio;
