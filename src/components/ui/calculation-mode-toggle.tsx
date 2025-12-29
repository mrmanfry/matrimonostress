import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Target, Users, CheckCircle2 } from "lucide-react";

interface CalculationModeToggleProps {
  value: 'planned' | 'expected' | 'confirmed';
  onValueChange: (value: 'planned' | 'expected' | 'confirmed') => void;
  breakdown?: {
    confirmed: number;
    pending: number;
    declined: number;
  };
  plannedCounts?: {
    adults: number;
    children: number;
    staff: number;
  };
  expectedDetails?: {
    source: 'std_responses' | 'full_list';
    details: string;
    adults: number;
    children: number;
    staff: number;
  };
}

export function CalculationModeToggle({ 
  value, 
  onValueChange, 
  breakdown, 
  plannedCounts,
  expectedDetails 
}: CalculationModeToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(v) => v && onValueChange(v as any)}
        className="justify-start"
      >
        <ToggleGroupItem 
          value="planned" 
          aria-label="Pianificato"
          className="gap-2"
        >
          <Target className="h-4 w-4" />
          Pianificato
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="expected" 
          aria-label="Previsti"
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Previsti
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="confirmed" 
          aria-label="Confermati"
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Confermati
        </ToggleGroupItem>
      </ToggleGroup>
      
      {plannedCounts && value === 'planned' && (
        <p className="text-xs text-muted-foreground">
          {plannedCounts.adults} adulti, {plannedCounts.children} bambini, {plannedCounts.staff} staff
        </p>
      )}
      
      {value === 'expected' && expectedDetails && (
        <p className="text-xs text-muted-foreground">
          {expectedDetails.adults} adulti, {expectedDetails.children} bambini, {expectedDetails.staff} staff
          <br />
          <span className="text-muted-foreground/70">{expectedDetails.details}</span>
        </p>
      )}
      
      {value === 'expected' && !expectedDetails && breakdown && (
        <p className="text-xs text-muted-foreground">
          {breakdown.confirmed} confermati + {breakdown.pending} in attesa
          {breakdown.declined > 0 && ` (${breakdown.declined} rifiutati esclusi)`}
        </p>
      )}
      
      {breakdown && value === 'confirmed' && (
        <p className="text-xs text-muted-foreground">
          Solo invitati confermati ({breakdown.pending} in attesa esclusi)
        </p>
      )}
    </div>
  );
}