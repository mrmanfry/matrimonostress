import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, CloudOff, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function MassBooklet() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const weddingId =
    authState.status === "authenticated" ? authState.activeWeddingId : null;

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<MassBookletContent>(
    createDefaultBookletContent()
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [bookletId, setBookletId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        // existing booklet
        const raw = data.content as Record<string, any>;
        setContent({ ...createDefaultBookletContent(), ...raw });
        setCurrentStep(data.current_step || 1);
        setBookletId(data.id);
      } else {
        // new booklet — pre-populate from wedding data
        const { data: wed } = await supabase
          .from("weddings")
          .select("wedding_date, venue_name")
          .eq("id", weddingId)
          .maybeSingle();

        const defaults = createDefaultBookletContent();
        if (wed?.venue_name) defaults.church_name = wed.venue_name;
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

      // abort any pending save
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSaveStatus("saving");

      // sanitize text fields
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
    (c: MassBookletContent) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveToDb(c, currentStep), 3000);
    },
    [saveToDb, currentStep]
  );

  const handleContentChange = useCallback(
    (patch: Partial<MassBookletContent>) => {
      setContent((prev) => {
        const next = { ...prev, ...patch };
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave]
  );

  // ──── Step navigation (immediate save) ────
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

  // ──── cleanup debounce on unmount ────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
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
          <LogOut className="w-3.5 h-3.5" /> Salva ed esci
        </Button>
      </div>

      {/* Stepper */}
      <BookletStepper currentStep={currentStep} onStepClick={goToStep} />

      {/* Step content */}
      {currentStep === 1 && <BookletStepSetup content={content} onChange={handleContentChange} />}
      {currentStep === 2 && <BookletStepRite content={content} onChange={handleContentChange} />}
      {currentStep === 3 && <BookletStepReadings content={content} onChange={handleContentChange} />}
      {currentStep === 4 && <BookletStepCustom content={content} onChange={handleContentChange} />}
      {currentStep === 5 && <BookletStepPreview content={content} onGoToStep={goToStep} />}

      {/* Nav buttons */}
      <div className="flex justify-between mt-8 max-w-2xl mx-auto">
        <Button
          variant="outline"
          disabled={currentStep === 1}
          onClick={() => goToStep(currentStep - 1)}
        >
          ← Indietro
        </Button>
        {currentStep < 5 && (
          <Button onClick={() => goToStep(currentStep + 1)}>
            Avanti →
          </Button>
        )}
      </div>
    </div>
  );
}
