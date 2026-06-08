import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  value: number;
  onChange: (v: number) => void;
  eligibleCount: number;
}

export function GiftSimulatorSlider({ value, onChange, eligibleCount }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Simulatore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">
            Media regalo per nucleo familiare
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              min={0}
              max={1000}
              step={50}
              value={[value]}
              onValueChange={([v]) => onChange(v)}
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={5000}
                step={50}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-24 text-right"
              />
              <span className="text-sm text-muted-foreground">€</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          La stima si applica a <strong>{eligibleCount}</strong> nucl
          {eligibleCount === 1 ? 'eo' : 'ei'} familiare{eligibleCount !== 1 ? 'i' : ''} con RSVP confermato o in attesa senza regalo registrato.
        </p>
      </CardContent>
    </Card>
  );
}
