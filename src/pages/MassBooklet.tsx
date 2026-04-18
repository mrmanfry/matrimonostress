import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, CloudOff, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  createDefaultBookletContent,
  sanitizeBookletText,
  type MassBookletContent,
} from "@/lib/massBookletSchema";
import BookletStepper from "@/components/mass-booklet/BookletStepper";
import BookletStepSetup from "@/components/mass-booklet/BookletStepSetup";
import BookletStepRite from "@/components/mass-booklet/BookletStepRite";
import BookletStepReadings from "@/components/mass-booklet/BookletStepReadings";
import BookletStepCustom from "@/components/mass-booklet/BookletStepCustom";
import BookletStepPreview from "@/components/mass-booklet/BookletStepPreview";
import BookletStepStyle from "@/components/mass-booklet/BookletStepStyle";
import BookletShell from "@/components/mass-booklet/v2/BookletShell";
import BookletEditor from "@/components/mass-booklet/v2/BookletEditor";
import BookletLivePreview from "@/components/mass-booklet/v2/BookletLivePreview";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function MassBooklet() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const weddingId =
    authState.status === "authenticated" ? authState.activeWeddingId : null;

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<MassBookletContent>(
    createDefaultBookletContent()
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [openSection, setOpenSection] = useState<string>("setup");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [bookletId, setBookletId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const partner1 = useMemo(() => {
    if (authState.status !== "authenticated") return "";
    return authState.weddings?.find((w) => w.weddingId === weddingId)?.partner1Name || "";
  }, [authState, weddingId]);

  const partner2 = useMemo(() => {
    if (authState.status !== "authenticated") return "";
    return authState.weddings?.find((w) => w.weddingId === weddingId)?.partner2Name || "";
  }, [authState, weddingId]);

  // ──── Load / create booklet ────
  useEffect(() => {
    if (!weddingId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("mass_booklets")
        .select("*")
        .eq("wedding_id", weddingId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("load booklet error", error);
        setLoading(false);
        return;
      }

      if (data) {
        const raw = data.content as Record<string, any>;
        setContent({ ...createDefaultBookletContent(), ...raw });
        setCurrentStep(data.current_step || 1);
        setBookletId(data.id);
      } else {
        const { data: wed } = await supabase
          .from("weddings")
          .select("wedding_date")
          .eq("id", weddingId)
          .maybeSingle();

        const defaults = createDefaultBookletContent();
        if (wed?.wedding_date) {
          const d = new Date(wed.wedding_date);
          defaults.ceremony_date_text = d.toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }
        setContent(defaults);
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [weddingId]);

  // ──── Save helper ────
  const saveToDb = useCallback(
    async (c: MassBookletContent, step: number) => {
      if (!weddingId) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSaveStatus("saving");

      const sanitized: MassBookletContent = {
        ...c,
        church_name: sanitizeBookletText(c.church_name),
        priest_name: sanitizeBookletText(c.priest_name),
        prayers: {
          ...c.prayers,
          intentions: c.prayers.intentions.map(sanitizeBookletText),
        },
        thanks: { text: sanitizeBookletText(c.thanks.text) },
      };

      const payload = {
        wedding_id: weddingId,
        content: sanitized as any,
        current_step: step,
        status: "draft" as const,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = bookletId
        ? await supabase
            .from("mass_booklets")
            .update(payload)
            .eq("id", bookletId)
            .select("id")
            .single()
        : await supabase
            .from("mass_booklets")
            .insert(payload)
            .select("id")
            .single();

      if (controller.signal.aborted) return;

      if (error) {
        console.error("save error", error);
        setSaveStatus("error");
        return;
      }

      if (data && !bookletId) setBookletId(data.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 3000);
    },
    [weddingId, bookletId]
  );

  // ──── Debounced auto-save on content change ────
  const scheduleAutoSave = useCallback(
    (c: MassBookletContent, step: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveToDb(c, step), 3000);
    },
    [saveToDb]
  );

  const handleContentChange = useCallback(
    (patch: Partial<MassBookletContent>) => {
      setContent((prev) => {
        const next = { ...prev, ...patch };
        scheduleAutoSave(next, currentStep);
        return next;
      });
    },
    [scheduleAutoSave, currentStep]
  );

  // ──── Step navigation (mobile fallback) ────
  const goToStep = useCallback(
    (step: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      saveToDb(content, step);
      setCurrentStep(step);
    },
    [content, saveToDb]
  );

  const handleSaveAndExit = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveToDb(content, currentStep);
    toast({ title: "Libretto salvato", description: "Potrai riprendere in qualsiasi momento." });
    navigate("/app/dashboard");
  }, [content, currentStep, saveToDb, navigate, toast]);

  // cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ──── Section completion (drives the editor accordion check marks) ────
  const completion = useMemo(
    () => ({
      setup: !!(content.church_name && content.priest_name && content.ceremony_date_text),
      rito: !!content.rite_type,
      letture: !!(
        (content.readings.first_reading || content.readings.use_custom_first_reading) &&
        (content.readings.psalm || content.readings.use_custom_psalm) &&
        (content.readings.gospel || content.readings.use_custom_gospel)
      ),
      personalizzazioni: !!content.songs.entrance,
      stile: true,
    }),
    [content]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Mobile fallback: keep the legacy stepper (split-screen + A5 preview don't fit on mobile) ───
  if (isMobile) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Libretto Messa</h1>
            <div className="flex items-center gap-1.5 mt-1">
              {saveStatus === "saving" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Salvataggio...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Cloud className="w-3 h-3" /> Salvato
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <CloudOff className="w-3 h-3" /> Errore di salvataggio
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveAndExit} className="gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Esci
          </Button>
        </div>

        <BookletStepper currentStep={currentStep} onStepClick={goToStep} />

        {currentStep === 1 && <BookletStepSetup content={content} onChange={handleContentChange} />}
        {currentStep === 2 && <BookletStepRite content={content} onChange={handleContentChange} />}
        {currentStep === 3 && (
          <BookletStepReadings content={content} onChange={handleContentChange} />
        )}
        {currentStep === 4 && (
          <BookletStepCustom content={content} onChange={handleContentChange} />
        )}
        {currentStep === 5 && (
          <BookletStepStyle content={content} onChange={handleContentChange} />
        )}
        {currentStep === 6 && (
          <BookletStepPreview
            content={content}
            onGoToStep={goToStep}
            partner1={partner1}
            partner2={partner2}
          />
        )}

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            disabled={currentStep === 1}
            onClick={() => goToStep(currentStep - 1)}
          >
            ← Indietro
          </Button>
          {currentStep < 6 && (
            <Button onClick={() => goToStep(currentStep + 1)}>Avanti →</Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Desktop: split-screen editor + live preview (v2) ───
  return (
    <BookletShell
      content={content}
      partner1={partner1}
      partner2={partner2}
      saveStatus={saveStatus}
      onSaveAndExit={handleSaveAndExit}
      editor={
        <BookletEditor
          content={content}
          onChange={handleContentChange}
          openSection={openSection}
          onOpenChange={setOpenSection}
          completion={completion}
        />
      }
      preview={
        <BookletLivePreview content={content} partner1={partner1} partner2={partner2} />
      }
    />
  );
}
