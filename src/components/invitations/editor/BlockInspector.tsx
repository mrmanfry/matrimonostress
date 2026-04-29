import { useState } from "react";
import type {
  InvitationBlock,
  CoverBlock,
  CeremonyBlock,
  ReceptionBlock,
  RsvpBlock,
  GiftRegistryBlock,
  FaqBlock,
  RichTextBlock,
  GalleryBlock,
  CountdownBlock,
  ScheduleBlock,
  TravelInfoBlock,
  DressCodeBlock,
  DividerBlock,
  FooterBlock,
  StdMessageBlock,
  StdResponseBlock,
  FaqItem,
  GalleryImage,
  ScheduleItem,
  TravelSection,
} from "@/lib/invitationBlocks/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type UpdateConfig<B extends InvitationBlock> = (partial: Partial<B["config"]>) => void;

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `it_${Math.random().toString(36).slice(2, 11)}`;
}

// ---------- Image upload helper ----------
function useImageUpload(weddingId: string, prefix: string) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "File non valido", description: "Solo immagini", variant: "destructive" });
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Max 5MB", variant: "destructive" });
      return null;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${weddingId}/${prefix}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("rsvp-images")
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("rsvp-images").getPublicUrl(fileName);
      return publicUrl;
    } catch (e: any) {
      toast({ title: "Errore upload", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  };
  return { upload, uploading };
}

function ImageField({
  label,
  url,
  onChange,
  weddingId,
  prefix,
}: {
  label: string;
  url: string | null;
  onChange: (url: string | null) => void;
  weddingId: string;
  prefix: string;
}) {
  const { upload, uploading } = useImageUpload(weddingId, prefix);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="border-2 border-dashed rounded-lg p-3 text-center">
        {url ? (
          <div className="space-y-2">
            <img src={url} alt="" className="w-full h-28 object-cover rounded" />
            <Button variant="outline" size="sm" onClick={() => onChange(null)}>
              Rimuovi
            </Button>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const u = await upload(f);
                if (u) onChange(u);
              }}
            />
            <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground text-sm">
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              <span>{uploading ? "Caricamento…" : "Carica immagine"}</span>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}

function ImagePositionField({
  value,
  onChange,
}: {
  value: "top" | "center" | "bottom" | undefined;
  onChange: (v: "top" | "center" | "bottom") => void;
}) {
  return (
    <div className="space-y-1">
      <Label>Posizione foto (ritaglio)</Label>
      <Select value={value ?? "center"} onValueChange={(v) => onChange(v as any)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="top">In alto (mostra la parte superiore)</SelectItem>
          <SelectItem value="center">Centrata</SelectItem>
          <SelectItem value="bottom">In basso (mostra la parte inferiore)</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Sposta il ritaglio se la foto taglia troppo cielo o soggetto.
      </p>
    </div>
  );
}

// ---------- Inspectors ----------
interface BaseProps<B extends InvitationBlock> {
  block: B;
  update: UpdateConfig<B>;
  weddingId: string;
}

function CoverInspector({ block, update, weddingId }: BaseProps<CoverBlock>) {
  return (
    <div className="space-y-4">
      <ImageField
        label="Immagine di copertina"
        url={block.config.imageUrl}
        onChange={(u) => update({ imageUrl: u })}
        weddingId={weddingId}
        prefix="cover"
      />
      {block.config.imageUrl && (
        <ImagePositionField
          value={block.config.imagePosition}
          onChange={(v) => update({ imagePosition: v })}
        />
      )}
      <div className="space-y-1">
        <Label>Titolo (lascia vuoto per usare i nomi degli sposi)</Label>
        <Input
          value={block.config.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Anna & Marco"
        />
      </div>
      <div className="space-y-1">
        <Label>Sottotitolo</Label>
        <Input
          value={block.config.subtitle || ""}
          onChange={(e) => update({ subtitle: e.target.value || null })}
          placeholder="Sposi"
        />
      </div>
      <div className="space-y-1">
        <Label>Stile titolo</Label>
        <Select
          value={block.config.titleStyle}
          onValueChange={(v) => update({ titleStyle: v as "stacked" | "single-line" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stacked">Impilato (Anna / & / Marco)</SelectItem>
            <SelectItem value="single-line">Linea singola</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CeremonyInspector({ block, update, weddingId }: BaseProps<CeremonyBlock>) {
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
        I dati di luogo e orario vengono dalle impostazioni del matrimonio.
      </div>
      <div className="space-y-1">
        <Label>Titolo sezione</Label>
        <Input
          value={block.config.sectionTitle}
          onChange={(e) => update({ sectionTitle: e.target.value })}
        />
      </div>
      <ImageField
        label="Immagine cerimonia"
        url={block.config.imageUrl}
        onChange={(u) => update({ imageUrl: u })}
        weddingId={weddingId}
        prefix="ceremony"
      />
      {block.config.imageUrl && (
        <ImagePositionField
          value={block.config.imagePosition}
          onChange={(v) => update({ imagePosition: v })}
        />
      )}
      <div className="space-y-1">
        <Label>Etichetta bottone Maps</Label>
        <Input
          value={block.config.mapsButtonLabel}
          onChange={(e) => update({ mapsButtonLabel: e.target.value })}
        />
      </div>
    </div>
  );
}

function ReceptionInspector({ block, update, weddingId }: BaseProps<ReceptionBlock>) {
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
        I dati di luogo e orario vengono dalle impostazioni del matrimonio.
      </div>
      <div className="space-y-1">
        <Label>Titolo sezione</Label>
        <Input
          value={block.config.sectionTitle}
          onChange={(e) => update({ sectionTitle: e.target.value })}
        />
      </div>
      <ImageField
        label="Immagine ricevimento"
        url={block.config.imageUrl}
        onChange={(u) => update({ imageUrl: u })}
        weddingId={weddingId}
        prefix="reception"
      />
      {block.config.imageUrl && (
        <ImagePositionField
          value={block.config.imagePosition}
          onChange={(v) => update({ imagePosition: v })}
        />
      )}
      <div className="space-y-1">
        <Label>Etichetta bottone Maps</Label>
        <Input
          value={block.config.mapsButtonLabel}
          onChange={(e) => update({ mapsButtonLabel: e.target.value })}
        />
      </div>
    </div>
  );
}

function RsvpInspector({ block, update }: BaseProps<RsvpBlock>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo</Label>
        <Input value={block.config.title} onChange={(e) => update({ title: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Messaggio di benvenuto</Label>
        <Textarea
          rows={3}
          value={block.config.welcomeMessage}
          onChange={(e) => update({ welcomeMessage: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Etichetta scadenza</Label>
        <Input
          value={block.config.deadlineLabel}
          onChange={(e) => update({ deadlineLabel: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Etichetta bambino</Label>
        <Input
          value={block.config.childLabel}
          onChange={(e) => update({ childLabel: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Testo bottone conferma</Label>
        <Input
          value={block.config.confirmButtonText}
          onChange={(e) => update({ confirmButtonText: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Helper "in attesa"</Label>
        <Input
          value={block.config.pendingHelperText}
          onChange={(e) => update({ pendingHelperText: e.target.value })}
        />
      </div>
    </div>
  );
}

function GiftRegistryInspector({ block, update, weddingId }: BaseProps<GiftRegistryBlock>) {
  const c = block.config;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo</Label>
        <Input value={c.title} onChange={(e) => update({ title: e.target.value })} />
      </div>
      <ImageField
        label="Immagine sezione"
        url={c.imageUrl ?? null}
        onChange={(u) => update({ imageUrl: u })}
        weddingId={weddingId}
        prefix="gift-registry"
      />
      {c.imageUrl && (
        <ImagePositionField
          value={c.imagePosition}
          onChange={(v) => update({ imagePosition: v })}
        />
      )}
      <div className="space-y-1">
        <Label>Messaggio</Label>
        <Textarea
          rows={3}
          value={c.message}
          onChange={(e) => update({ message: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Nomi sulla lista</Label>
        <Input
          value={c.coupleNames}
          onChange={(e) => update({ coupleNames: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>IBAN</Label>
          <Input
            value={c.iban || ""}
            onChange={(e) => update({ iban: e.target.value || null })}
          />
        </div>
        <div className="space-y-1">
          <Label>BIC/SWIFT</Label>
          <Input
            value={c.bicSwift || ""}
            onChange={(e) => update({ bicSwift: e.target.value || null })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Banca</Label>
        <Input
          value={c.bankName || ""}
          onChange={(e) => update({ bankName: e.target.value || null })}
        />
      </div>
      <div className="space-y-1">
        <Label>URL lista nozze esterna</Label>
        <Input
          value={c.registryUrl || ""}
          onChange={(e) => update({ registryUrl: e.target.value || null })}
          placeholder="https://…"
        />
      </div>
      <label className="flex items-center justify-between rounded-md border p-2">
        <span className="text-sm">Mostra bottone "Copia IBAN"</span>
        <Switch
          checked={c.showCopyButton}
          onCheckedChange={(v) => update({ showCopyButton: v })}
        />
      </label>
    </div>
  );
}

function FaqInspector({
  block,
  update,
  weddingId,
}: BaseProps<FaqBlock>) {
  const { toast } = useToast();
  const [polishingId, setPolishingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const items = block.config.items;

  const updateItem = (id: string, patch: Partial<FaqItem>) => {
    update({ items: items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  };
  const removeItem = (id: string) => {
    update({ items: items.filter((i) => i.id !== id) });
  };
  const addItem = () => {
    update({ items: [...items, { id: uid(), question: "", answer: "" }] });
  };

  const polishItem = async (item: FaqItem) => {
    if (!item.question.trim() && !item.answer.trim()) return;
    setPolishingId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-rsvp-faqs", {
        body: {
          weddingId,
          mode: "polish",
          draft_question: item.question,
          draft_answer: item.answer,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Errore AI", description: data.error, variant: "destructive" });
        return;
      }
      if (data?.question || data?.answer) {
        updateItem(item.id, {
          question: data.question || item.question,
          answer: data.answer || item.answer,
        });
        toast({ title: "FAQ migliorata!" });
      }
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setPolishingId(null);
    }
  };

  const generateBatch = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-rsvp-faqs", {
        body: { weddingId },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Errore AI", description: data.error, variant: "destructive" });
        return;
      }
      if (data?.faqs?.length) {
        const newItems = data.faqs.map((f: any) => ({
          id: uid(),
          question: f.question,
          answer: f.answer,
        }));
        update({ items: [...items, ...newItems] });
        toast({ title: "FAQ generate", description: `${newItems.length} aggiunte` });
      }
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo</Label>
        <Input
          value={block.config.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Comportamento espansione</Label>
        <Select
          value={block.config.expandBehavior}
          onValueChange={(v) =>
            update({ expandBehavior: v as "single" | "multiple" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Una alla volta</SelectItem>
            <SelectItem value="multiple">Più aperte insieme</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="flex-1">
          <Plus className="w-4 h-4 mr-1" />
          FAQ
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateBatch}
          disabled={generating}
          className="flex-1"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-1" />
          )}
          Genera con AI
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-md border p-2 space-y-2">
            <Input
              value={it.question}
              onChange={(e) => updateItem(it.id, { question: e.target.value })}
              placeholder="Domanda"
            />
            <Textarea
              rows={2}
              value={it.answer}
              onChange={(e) => updateItem(it.id, { answer: e.target.value })}
              placeholder="Risposta"
            />
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={polishingId === it.id}
                onClick={() => polishItem(it)}
              >
                {polishingId === it.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span className="ml-1 text-xs">Migliora</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeItem(it.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RichTextInspector({ block, update }: BaseProps<RichTextBlock>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo (opzionale)</Label>
        <Input
          value={block.config.title || ""}
          onChange={(e) => update({ title: e.target.value || null })}
        />
      </div>
      <div className="space-y-1">
        <Label>Contenuto</Label>
        <Textarea
          rows={6}
          value={block.config.content}
          onChange={(e) => update({ content: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Allineamento</Label>
        <Select
          value={block.config.alignment}
          onValueChange={(v) => update({ alignment: v as "left" | "center" | "right" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Sinistra</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Destra</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function GalleryInspector({ block, update, weddingId }: BaseProps<GalleryBlock>) {
  const { upload, uploading } = useImageUpload(weddingId, "gallery");
  const images = block.config.images;
  const removeImage = (id: string) => update({ images: images.filter((i) => i.id !== id) });
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo (opzionale)</Label>
        <Input
          value={block.config.title || ""}
          onChange={(e) => update({ title: e.target.value || null })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Layout</Label>
          <Select
            value={block.config.layout}
            onValueChange={(v) => update({ layout: v as "grid" | "carousel" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Griglia</SelectItem>
              <SelectItem value="carousel">Carosello</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Colonne</Label>
          <Select
            value={String(block.config.columns)}
            onValueChange={(v) => update({ columns: Number(v) as 2 | 3 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="block border-2 border-dashed rounded-md p-3 text-center cursor-pointer text-sm text-muted-foreground">
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            const uploaded: GalleryImage[] = [];
            for (const f of files) {
              const u = await upload(f);
              if (u) uploaded.push({ id: uid(), url: u, caption: null });
            }
            if (uploaded.length) update({ images: [...images, ...uploaded] });
          }}
        />
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin inline" />
        ) : (
          <span>+ Aggiungi immagini</span>
        )}
      </label>

      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative group">
            <img src={img.url} alt="" className="w-full h-20 object-cover rounded" />
            <button
              type="button"
              onClick={() => removeImage(img.id)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountdownInspector({ block, update }: BaseProps<CountdownBlock>) {
  const c = block.config;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo (opzionale)</Label>
        <Input
          value={c.title || ""}
          onChange={(e) => update({ title: e.target.value || null })}
        />
      </div>
      {(["showDays", "showHours", "showMinutes", "showSeconds"] as const).map((k) => (
        <label key={k} className="flex items-center justify-between rounded-md border p-2">
          <span className="text-sm capitalize">
            {k === "showDays"
              ? "Giorni"
              : k === "showHours"
              ? "Ore"
              : k === "showMinutes"
              ? "Minuti"
              : "Secondi"}
          </span>
          <Switch checked={c[k]} onCheckedChange={(v) => update({ [k]: v } as any)} />
        </label>
      ))}
    </div>
  );
}

function ScheduleInspector({ block, update }: BaseProps<ScheduleBlock>) {
  const items = block.config.items;
  const updateItem = (id: string, patch: Partial<ScheduleItem>) =>
    update({ items: items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo</Label>
        <Input
          value={block.config.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          update({
            items: [...items, { id: uid(), time: "", label: "", description: "" }],
          })
        }
      >
        <Plus className="w-4 h-4 mr-1" />
        Voce
      </Button>
      {items.map((it) => (
        <div key={it.id} className="rounded-md border p-2 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="15:30"
              value={it.time}
              onChange={(e) => updateItem(it.id, { time: e.target.value })}
            />
            <Input
              className="col-span-2"
              placeholder="Cerimonia"
              value={it.label}
              onChange={(e) => updateItem(it.id, { label: e.target.value })}
            />
          </div>
          <Textarea
            rows={2}
            placeholder="Dettagli (opzionale)"
            value={it.description}
            onChange={(e) => updateItem(it.id, { description: e.target.value })}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => update({ items: items.filter((i) => i.id !== it.id) })}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TravelInfoInspector({ block, update }: BaseProps<TravelInfoBlock>) {
  const sections = block.config.sections;
  const updateSection = (id: string, patch: Partial<TravelSection>) =>
    update({ sections: sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo</Label>
        <Input
          value={block.config.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          update({ sections: [...sections, { id: uid(), heading: "", body: "" }] })
        }
      >
        <Plus className="w-4 h-4 mr-1" />
        Sezione
      </Button>
      {sections.map((s) => (
        <div key={s.id} className="rounded-md border p-2 space-y-2">
          <Input
            placeholder="Titolo sezione (es. Hotel consigliati)"
            value={s.heading}
            onChange={(e) => updateSection(s.id, { heading: e.target.value })}
          />
          <Textarea
            rows={3}
            value={s.body}
            onChange={(e) => updateSection(s.id, { body: e.target.value })}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => update({ sections: sections.filter((x) => x.id !== s.id) })}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DressCodeInspector({ block, update, weddingId }: BaseProps<DressCodeBlock>) {
  const c = block.config;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo</Label>
        <Input value={c.title} onChange={(e) => update({ title: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Descrizione</Label>
        <Textarea
          rows={3}
          value={c.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Palette colori (hex separati da virgola)</Label>
        <Input
          value={c.paletteColors.join(", ")}
          onChange={(e) =>
            update({
              paletteColors: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="#D4AF37, #1a1a1a, #f5f0e0"
        />
        {c.paletteColors.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {c.paletteColors.map((col, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        )}
      </div>
      <ImageField
        label="Immagine di riferimento"
        url={c.referenceImageUrl}
        onChange={(u) => update({ referenceImageUrl: u })}
        weddingId={weddingId}
        prefix="dresscode"
      />
    </div>
  );
}

function DividerInspector({ block, update }: BaseProps<DividerBlock>) {
  return (
    <div className="space-y-1">
      <Label>Stile</Label>
      <Select
        value={block.config.style}
        onValueChange={(v) => update({ style: v as "line" | "dots" | "ornament" })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="line">Linea</SelectItem>
          <SelectItem value="dots">Punti</SelectItem>
          <SelectItem value="ornament">Ornamento</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function FooterInspector({ block, update }: BaseProps<FooterBlock>) {
  return (
    <label className="flex items-center justify-between rounded-md border p-2">
      <span className="text-sm">Mostra "Powered by WedsApp"</span>
      <Switch
        checked={block.config.showPoweredBy}
        onCheckedChange={(v) => update({ showPoweredBy: v })}
      />
    </label>
  );
}

function StdMessageInspector({ block, update }: BaseProps<StdMessageBlock>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Etichetta</Label>
        <Input value={block.config.label} onChange={(e) => update({ label: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Frase</Label>
        <Textarea
          rows={3}
          value={block.config.quote}
          onChange={(e) => update({ quote: e.target.value })}
        />
      </div>
    </div>
  );
}

function StdResponseInspector({ block, update }: BaseProps<StdResponseBlock>) {
  const c = block.config;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Titolo</Label>
        <Input value={c.title} onChange={(e) => update({ title: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Sì</Label>
          <Input value={c.yesLabel} onChange={(e) => update({ yesLabel: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Forse</Label>
          <Input value={c.maybeLabel} onChange={(e) => update({ maybeLabel: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">No</Label>
          <Input value={c.noLabel} onChange={(e) => update({ noLabel: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Helper</Label>
        <Input value={c.helperText} onChange={(e) => update({ helperText: e.target.value })} />
      </div>
      <label className="flex items-center justify-between rounded-md border p-2">
        <span className="text-sm">Mostra bottone "Aggiungi al calendario"</span>
        <Switch
          checked={c.showCalendarButton}
          onCheckedChange={(v) => update({ showCalendarButton: v })}
        />
      </label>
    </div>
  );
}

// ---------- Dispatcher ----------
interface InspectorProps {
  block: InvitationBlock;
  weddingId: string;
  onUpdate: (partial: any) => void;
}

export function BlockInspector({ block, weddingId, onUpdate }: InspectorProps) {
  switch (block.type) {
    case "cover":
      return <CoverInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "ceremony":
      return <CeremonyInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "reception":
      return <ReceptionInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "rsvp":
      return <RsvpInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "gift_registry":
      return <GiftRegistryInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "faq":
      return <FaqInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "rich_text":
      return <RichTextInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "gallery":
      return <GalleryInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "countdown":
      return <CountdownInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "schedule":
      return <ScheduleInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "travel_info":
      return <TravelInfoInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "dress_code":
      return <DressCodeInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "divider":
      return <DividerInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "footer":
      return <FooterInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "std_message":
      return <StdMessageInspector block={block} update={onUpdate} weddingId={weddingId} />;
    case "std_response":
      return <StdResponseInspector block={block} update={onUpdate} weddingId={weddingId} />;
  }
}
