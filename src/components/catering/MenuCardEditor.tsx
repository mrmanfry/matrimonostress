import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FONT_MAP, type FontStyle } from "@/components/print/PrintDesignStep";
import type { ImageTransform, EdgeStyle } from "@/components/print/PrintInvitationEditor";
import PrintGenerationStep from "@/components/print/PrintGenerationStep";
import MenuDesignStep, { type MenuFormat } from "./MenuDesignStep";
import MenuAudienceStep, {
  type MenuAudienceMode,
  type MenuTableTarget,
  type MenuGuestTarget,
} from "./MenuAudienceStep";
import HiddenMenuNode from "./HiddenMenuNode";
import type { MenuData } from "./MenuComposer";
import { isConfirmed } from "@/lib/rsvpHelpers";

interface MenuDesignConfig {
  fontStyle: FontStyle;
  edgeStyle: EdgeStyle;
  imageTransform: ImageTransform;
  backgroundImagePath: string | null;
  menuFormat: MenuFormat;
  printed_ids?: string[];
}

interface MenuCardEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  menuData: MenuData;
}

const STEPS = [
  { label: 'Design', number: 1 },
  { label: 'Destinatari', number: 2 },
];

const MenuCardEditor = ({ open, onOpenChange, weddingId, menuData }: MenuCardEditorProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [fontStyle, setFontStyle] = useState<FontStyle>('garamond');
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [imageTransform, setImageTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>('none');
  const [menuFormat, setMenuFormat] = useState<MenuFormat>('a5');

  // Persistence
  const [bgDirty, setBgDirty] = useState(false);
  const [savedBgPath, setSavedBgPath] = useState<string | null>(null);
  const [designLoaded, setDesignLoaded] = useState(false);
  const [printedIds, setPrintedIds] = useState<string[]>([]);

  // Wedding data
  const [partnerNames, setPartnerNames] = useState('');

  // Step 2 state
  const [audienceMode, setAudienceMode] = useState<MenuAudienceMode>('table');
  const [tables, setTables] = useState<MenuTableTarget[]>([]);
  const [guests, setGuests] = useState<MenuGuestTarget[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingAudience, setLoadingAudience] = useState(false);

  // Step 3 state
  const [progress, setProgress] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // For hidden node rendering
  const [renderTarget, setRenderTarget] = useState<{ label: string; dietary?: string | null } | null>(null);
  const bgDataUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (open && weddingId) fetchDesign();
  }, [open, weddingId]);

  const fetchDesign = async () => {
    const { data } = await supabase
      .from('weddings')
      .select('partner1_name, partner2_name, catering_config')
      .eq('id', weddingId)
      .single();
    if (data) {
      setPartnerNames(`${data.partner1_name} & ${data.partner2_name}`);
      const config = (data.catering_config as any)?.menu_design as MenuDesignConfig | undefined;
      if (config && !designLoaded) {
        if (config.fontStyle) setFontStyle(config.fontStyle);
        if (config.edgeStyle) setEdgeStyle(config.edgeStyle);
        if (config.imageTransform) setImageTransform(config.imageTransform);
        if (config.menuFormat) setMenuFormat(config.menuFormat);
        if (config.printed_ids) setPrintedIds(config.printed_ids);
        if (config.backgroundImagePath) {
          setSavedBgPath(config.backgroundImagePath);
          loadBgFromStorage(config.backgroundImagePath);
        }
        setDesignLoaded(true);
      }
    }
  };

  const loadBgFromStorage = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('print-assets').download(path);
      if (error || !data) return;
      setBackgroundImage(URL.createObjectURL(data));
      setBgDirty(false);
    } catch (err) {
      console.error('Error loading menu background:', err);
    }
  };

  const handleBgChange = useCallback((url: string | null) => {
    setBackgroundImage(url);
    setBgDirty(true);
  }, []);

  const saveDesign = useCallback(async () => {
    let bgPath = savedBgPath;
    if (bgDirty && backgroundImage) {
      try {
        if (savedBgPath) await supabase.storage.from('print-assets').remove([savedBgPath]);
        const response = await fetch(backgroundImage);
        const blob = await response.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const newPath = `${weddingId}/menu_bg_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('print-assets').upload(newPath, blob, { contentType: blob.type, upsert: true });
        if (!error) { bgPath = newPath; setSavedBgPath(newPath); }
      } catch (err) { console.error('Error uploading menu bg:', err); }
    } else if (bgDirty && !backgroundImage) {
      if (savedBgPath) await supabase.storage.from('print-assets').remove([savedBgPath]);
      bgPath = null;
      setSavedBgPath(null);
    }

    const config: MenuDesignConfig = { fontStyle, edgeStyle, imageTransform, backgroundImagePath: bgPath, menuFormat, printed_ids: printedIds };
    // Read current catering_config and merge
    const { data: w } = await supabase.from('weddings').select('catering_config').eq('id', weddingId).single();
    const cc = (w?.catering_config || {}) as any;
    await supabase.from('weddings').update({ catering_config: { ...cc, menu_design: config } as any }).eq('id', weddingId);
    setBgDirty(false);
  }, [backgroundImage, bgDirty, savedBgPath, fontStyle, edgeStyle, imageTransform, menuFormat, printedIds, weddingId]);

  // Load audience data
  useEffect(() => {
    if (step === 2 && weddingId) { loadAudience(); saveDesign(); }
  }, [step, weddingId]);

  const loadAudience = async () => {
    setLoadingAudience(true);
    try {
      const [{ data: tablesData }, { data: guestsData }, { data: assignments }, { data: parties }] = await Promise.all([
        supabase.from('tables').select('id, name').eq('wedding_id', weddingId),
        supabase.from('guests').select('id, first_name, last_name, dietary_restrictions, party_id, is_staff, is_couple_member, rsvp_status').eq('wedding_id', weddingId).eq('is_staff', false),
        supabase.from('table_assignments').select('guest_id, table_id'),
        supabase.from('invite_parties').select('id, rsvp_status').eq('wedding_id', weddingId),
      ]);

      const assignMap = new Map((assignments || []).map(a => [a.guest_id, a.table_id]));
      const tableNameMap = new Map((tablesData || []).map(t => [t.id, t.name]));
      const partyStatusMap = new Map((parties || []).map(p => [p.id, p.rsvp_status as string]));

      // Tables with guest counts
      const tableGuestCounts = new Map<string, number>();
      (guestsData || []).filter(g => !g.is_couple_member).forEach(g => {
        const tid = assignMap.get(g.id);
        if (tid) tableGuestCounts.set(tid, (tableGuestCounts.get(tid) || 0) + 1);
      });

      setTables((tablesData || []).map(t => ({
        tableId: t.id,
        tableName: t.name,
        guestCount: tableGuestCounts.get(t.id) || 0,
      })));

      // Confirmed guests for placecard
      const confirmedGuests = (guestsData || []).filter(g => {
        if (g.is_couple_member) return false;
        const ps = g.party_id ? partyStatusMap.get(g.party_id) : null;
        return ps ? isConfirmed(ps) : isConfirmed(g.rsvp_status);
      });

      setGuests(confirmedGuests.map(g => ({
        guestId: g.id,
        displayName: `${g.first_name} ${g.last_name}`.trim(),
        tableName: assignMap.has(g.id) ? (tableNameMap.get(assignMap.get(g.id)!) || null) : null,
        dietaryRestrictions: g.dietary_restrictions,
      })));
    } catch (err) {
      console.error('Error loading audience:', err);
    } finally {
      setLoadingAudience(false);
    }
  };

  // Convert blob URL for html2canvas
  useEffect(() => {
    if (backgroundImage && backgroundImage.startsWith('blob:')) {
      fetch(backgroundImage).then(r => r.blob()).then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => { bgDataUrlRef.current = reader.result as string; };
        reader.readAsDataURL(blob);
      });
    } else {
      bgDataUrlRef.current = backgroundImage;
    }
  }, [backgroundImage]);

  const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').replace(/\s+/g, '_');

  // PDF generation
  const generatePDF = useCallback(async () => {
    const targets = audienceMode === 'table'
      ? tables.filter(t => selectedIds.includes(t.tableId)).map(t => ({ id: t.tableId, label: t.tableName, dietary: null as string | null }))
      : guests.filter(g => selectedIds.includes(g.guestId)).map(g => ({ id: g.guestId, label: g.displayName, dietary: g.dietaryRestrictions }));

    if (targets.length === 0) return;

    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      const pdfBlobs: { name: string; blob: Blob }[] = [];
      const pdfFormat = menuFormat === 'a5' ? 'a5' : 'a6' as any;
      const pdfDims = menuFormat === 'a5' ? { w: 148, h: 210 } : { w: 105, h: 148 };

      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        setCurrentName(t.label);
        setCurrentIndex(i + 1);
        setProgress((i / targets.length) * 100);
        setRenderTarget({ label: t.label, dietary: t.dietary });

        await new Promise(resolve => setTimeout(resolve, 300));

        const node = document.getElementById('hidden-menu-node');
        if (!node) continue;

        const canvas = await html2canvas(node, { scale: 1, useCORS: true, logging: false, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfDims.w, pdfDims.h] });
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfDims.w, pdfDims.h);

        const prefix = audienceMode === 'table' ? 'Menu_Tavolo' : 'Menu';
        pdfBlobs.push({ name: `${prefix}_${sanitize(t.label)}.pdf`, blob: pdf.output('blob') });
      }

      setProgress(100);

      if (pdfBlobs.length === 1) {
        const url = URL.createObjectURL(pdfBlobs[0].blob);
        const a = document.createElement('a');
        a.href = url; a.download = pdfBlobs[0].name; a.click();
        URL.revokeObjectURL(url);
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        pdfBlobs.forEach(({ name, blob }) => zip.file(name, blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url; a.download = `Menu_${new Date().toISOString().slice(0, 10)}.zip`; a.click();
        URL.revokeObjectURL(url);
      }

      // Save printed IDs
      const newPrinted = [...new Set([...printedIds, ...selectedIds])];
      setPrintedIds(newPrinted);
      const { data: wData } = await supabase.from('weddings').select('catering_config').eq('id', weddingId).single();
      const cc = (wData?.catering_config || {}) as any;
      const existingDesign = cc.menu_design || {};
      await supabase.from('weddings').update({ catering_config: { ...cc, menu_design: { ...existingDesign, printed_ids: newPrinted } } as any }).eq('id', weddingId);

      await new Promise(resolve => setTimeout(resolve, 500));
      setIsSuccess(true);
    } catch (error) {
      console.error('Errore generazione menu PDF:', error);
      toast({ title: 'Errore di generazione', description: 'Non è stato possibile creare il PDF. Riprova.', variant: 'destructive' });
      setStep(2);
    }
  }, [tables, guests, selectedIds, audienceMode, menuFormat, printedIds, weddingId, toast]);

  useEffect(() => {
    if (step === 3) generatePDF();
  }, [step]);

  const handleClose = () => {
    if (step === 3 && !isSuccess) return;
    setStep(1);
    setProgress(0);
    setCurrentName('');
    setCurrentIndex(0);
    setIsSuccess(false);
    setSelectedIds([]);
    setRenderTarget(null);
    saveDesign();
    onOpenChange(false);
  };

  const fontFamily = FONT_MAP[fontStyle];
  const canGenerate = selectedIds.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent
          className="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col gap-0 [&>button]:hidden"
          onInteractOutside={(e) => { if (step === 3 && !isSuccess) e.preventDefault(); }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-foreground">Stampa Menu</h2>
              {step < 3 && (
                <div className="hidden md:flex items-center gap-2 text-sm">
                  {STEPS.map((s, idx) => (
                    <div key={s.number} className="flex items-center gap-1.5">
                      {idx > 0 && <span className="text-muted-foreground">→</span>}
                      <span className={step === s.number ? 'text-primary font-semibold' : step > s.number ? 'text-foreground' : 'text-muted-foreground'}>
                        {s.number}. {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} disabled={step === 3 && !isSuccess}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {step === 1 && (
              <MenuDesignStep
                backgroundImage={backgroundImage}
                onBackgroundChange={handleBgChange}
                fontStyle={fontStyle}
                onFontStyleChange={setFontStyle}
                showSafeZone={showSafeZone}
                onShowSafeZoneChange={setShowSafeZone}
                menuData={menuData}
                partnerNames={partnerNames}
                imageTransform={imageTransform}
                onImageTransformChange={setImageTransform}
                edgeStyle={edgeStyle}
                onEdgeStyleChange={setEdgeStyle}
                menuFormat={menuFormat}
                onMenuFormatChange={setMenuFormat}
              />
            )}
            {step === 2 && (
              loadingAudience ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <MenuAudienceStep
                  mode={audienceMode}
                  onModeChange={setAudienceMode}
                  tables={tables}
                  guests={guests}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  printedIds={printedIds}
                />
              )
            )}
            {step === 3 && (
              <PrintGenerationStep
                progress={progress}
                currentName={currentName}
                currentIndex={currentIndex}
                total={selectedIds.length}
                isSuccess={isSuccess}
                onClose={handleClose}
              />
            )}
          </div>

          {/* Footer */}
          {step < 3 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div>
                {step === 2 && (
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Design
                  </Button>
                )}
              </div>
              <div>
                {step === 1 && (
                  <Button onClick={() => setStep(2)}>
                    Destinatari <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {step === 2 && (
                  <Button onClick={() => setStep(3)} disabled={!canGenerate}>
                    Genera {selectedIds.length} PDF <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden render node */}
      {step === 3 && renderTarget && (
        <HiddenMenuNode
          targetLabel={renderTarget.label}
          dietaryBadge={renderTarget.dietary}
          fontFamily={fontFamily}
          backgroundImageUrl={bgDataUrlRef.current}
          menuData={menuData}
          partnerNames={partnerNames}
          imageTransform={imageTransform}
          edgeStyle={edgeStyle}
          format={menuFormat}
        />
      )}
    </>
  );
};

export default MenuCardEditor;
