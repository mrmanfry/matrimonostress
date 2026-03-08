import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Save, X, Plus, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DietaryOption {
  id: string;
  label: string;
  enabled: boolean;
  is_custom: boolean;
}

interface CateringConfig {
  dietary_options: DietaryOption[];
  show_allergy_field: boolean;
  show_dietary_notes: boolean;
}

interface CateringDietarySettingsProps {
  weddingId: string;
  config: CateringConfig;
  onConfigChange: (config: CateringConfig) => void;
}

const DEFAULT_CONFIG: CateringConfig = {
  dietary_options: [
    { id: "vegetariano", label: "Vegetariano", enabled: true, is_custom: false },
    { id: "vegano", label: "Vegano", enabled: true, is_custom: false },
    { id: "celiaco", label: "Celiaco / Senza Glutine", enabled: true, is_custom: false },
  ],
  show_allergy_field: true,
  show_dietary_notes: true,
};

export const CateringDietarySettings = ({ weddingId, config, onConfigChange }: CateringDietarySettingsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CateringConfig>(config || DEFAULT_CONFIG);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(config || DEFAULT_CONFIG);
    setIsEditing(true);
  };

  const cancel = () => {
    setIsEditing(false);
    setNewOptionLabel("");
  };

  const toggleOption = (id: string) => {
    setDraft(prev => ({
      ...prev,
      dietary_options: prev.dietary_options.map(o =>
        o.id === id ? { ...o, enabled: !o.enabled } : o
      ),
    }));
  };

  const removeCustomOption = (id: string) => {
    setDraft(prev => ({
      ...prev,
      dietary_options: prev.dietary_options.filter(o => o.id !== id),
    }));
  };

  const addCustomOption = () => {
    const label = newOptionLabel.trim();
    if (!label) return;
    const id = `custom_${Date.now()}`;
    setDraft(prev => ({
      ...prev,
      dietary_options: [...prev.dietary_options, { id, label, enabled: true, is_custom: true }],
    }));
    setNewOptionLabel("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("weddings")
        .update({ catering_config: draft as any })
        .eq("id", weddingId);
      if (error) throw error;
      onConfigChange(draft);
      setIsEditing(false);
      toast.success("Configurazione salvata");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const currentConfig = isEditing ? draft : (config || DEFAULT_CONFIG);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Opzioni Dietetiche RSVP
            </CardTitle>
            <CardDescription>
              Configura quali opzioni alimentari mostrare nel form RSVP degli invitati
            </CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="w-4 h-4 mr-1" /> Modifica
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancel} disabled={saving}>
                <X className="w-4 h-4 mr-1" /> Annulla
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> Salva
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dietary options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Opzioni disponibili nel form RSVP</Label>
          {currentConfig.dietary_options.map(opt => (
            <div key={opt.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm">{opt.label}</span>
                {opt.is_custom && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Custom</span>}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={opt.enabled}
                  onCheckedChange={() => isEditing && toggleOption(opt.id)}
                  disabled={!isEditing}
                />
                {isEditing && opt.is_custom && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCustomOption(opt.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {isEditing && (
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Es: Kosher, Halal..."
                value={newOptionLabel}
                onChange={e => setNewOptionLabel(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomOption()}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addCustomOption} disabled={!newOptionLabel.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Aggiungi
              </Button>
            </div>
          )}
        </div>

        {/* Extra fields */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium">Campi aggiuntivi</Label>
          <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
            <span className="text-sm">Campo "Allergie o intolleranze" (testo libero)</span>
            <Switch
              checked={currentConfig.show_allergy_field}
              onCheckedChange={checked => isEditing && setDraft(prev => ({ ...prev, show_allergy_field: checked }))}
              disabled={!isEditing}
            />
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
            <span className="text-sm">Campo "Note dietetiche aggiuntive"</span>
            <Switch
              checked={currentConfig.show_dietary_notes}
              onCheckedChange={checked => isEditing && setDraft(prev => ({ ...prev, show_dietary_notes: checked }))}
              disabled={!isEditing}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export type { CateringConfig, DietaryOption };
