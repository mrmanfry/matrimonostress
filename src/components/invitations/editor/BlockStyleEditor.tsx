import type { BlockStyleOverride } from "@/lib/invitationBlocks/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw } from "lucide-react";

interface Props {
  value: BlockStyleOverride | undefined;
  onChange: (next: BlockStyleOverride | undefined) => void;
}

export function BlockStyleEditor({ value, onChange }: Props) {
  const v = value || {};
  const update = (patch: Partial<BlockStyleOverride>) => {
    const next = { ...v, ...patch };
    // strip empty
    (Object.keys(next) as Array<keyof BlockStyleOverride>).forEach((k) => {
      if (next[k] === "" || next[k] === undefined) delete next[k];
    });
    onChange(Object.keys(next).length ? next : undefined);
  };

  return (
    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Stile blocco
        </Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(undefined)}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Sfondo</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={v.backgroundColor || "#ffffff"}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              className="h-9 w-12 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={v.backgroundColor || ""}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              placeholder="auto"
              className="h-9 text-xs"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Testo</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={v.textColor || "#000000"}
              onChange={(e) => update({ textColor: e.target.value })}
              className="h-9 w-12 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={v.textColor || ""}
              onChange={(e) => update({ textColor: e.target.value })}
              placeholder="auto"
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Spaziatura verticale</Label>
        <Select
          value={v.paddingY || "md"}
          onValueChange={(val) => update({ paddingY: val as "sm" | "md" | "lg" })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Compatta</SelectItem>
            <SelectItem value="md">Normale</SelectItem>
            <SelectItem value="lg">Ampia</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
