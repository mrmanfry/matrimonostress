import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface MemoriesSettingsProps {
  camera: any;
  onUpdate: (updates: any) => void;
}

export default function MemoriesSettings({ camera, onUpdate }: MemoriesSettingsProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    shots_per_person: camera?.shots_per_person || 27,
    film_type: camera?.film_type || "vintage",
    reveal_mode: camera?.reveal_mode || "after_event",
    ending_date: camera?.ending_date
      ? new Date(camera.ending_date).toISOString().slice(0, 16)
      : "",
    is_active: camera?.is_active ?? true,
    require_approval: camera?.require_approval ?? false,
  });

  const handleSave = () => {
    onUpdate({
      ...form,
      ending_date: form.ending_date ? new Date(form.ending_date).toISOString() : null,
    });
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Impostazioni Rullino</CardTitle>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            ✏️ Modifica
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Annulla
            </Button>
            <Button size="sm" onClick={handleSave}>
              Salva
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Scatti per persona</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.shots_per_person}
              onChange={(e) =>
                setForm({ ...form, shots_per_person: parseInt(e.target.value) || 27 })
              }
              disabled={!editing}
            />
          </div>

          <div className="space-y-2">
            <Label>Filtro pellicola</Label>
            <Select
              value={form.film_type}
              onValueChange={(v) => setForm({ ...form, film_type: v })}
              disabled={!editing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vintage">🎞️ Vintage</SelectItem>
                <SelectItem value="bw">⬛ Bianco e Nero</SelectItem>
                <SelectItem value="warm">🌅 Warm</SelectItem>
                <SelectItem value="classic">📷 Classic</SelectItem>
                <SelectItem value="none">🔲 Nessuno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modalità reveal</Label>
            <Select
              value={form.reveal_mode}
              onValueChange={(v) => setForm({ ...form, reveal_mode: v })}
              disabled={!editing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="after_event">Dopo l'evento</SelectItem>
                <SelectItem value="immediate">Immediato</SelectItem>
                <SelectItem value="manual">Manuale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Scadenza rullino</Label>
            <Input
              type="datetime-local"
              value={form.ending_date}
              onChange={(e) => setForm({ ...form, ending_date: e.target.value })}
              disabled={!editing}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <Label>Rullino attivo</Label>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              disabled={!editing}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Richiedi approvazione</Label>
              <p className="text-xs text-muted-foreground">
                Le foto devono essere approvate prima di apparire in galleria
              </p>
            </div>
            <Switch
              checked={form.require_approval}
              onCheckedChange={(v) => setForm({ ...form, require_approval: v })}
              disabled={!editing}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
