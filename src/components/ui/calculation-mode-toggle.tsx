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
    plusOnesConfirmed?: number;
    plusOnesPotential?: number;
    totalHeadCount?: number;
  };
  /** Hide detail text below the toggle on mobile */
  compact?: boolean;
}

export function CalculationModeToggle({ 
  value, 
  onValueChange, 
  breakdown, 
  plannedCounts,
  expectedDetails,
  compact 
}: CalculationModeToggleProps) {
  // Helper per formattare il breakdown con +1
  const formatBreakdown = (
    adults: number, 
    children: number, 
    staff: number, 
    plusOnes?: number
  ) => {
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} adulti`);
    if (children > 0) parts.push(`${children} bambini`);
    if (staff > 0) parts.push(`${staff} staff`);
    if (plusOnes && plusOnes > 0) parts.push(`${plusOnes} accomp.`);
    return parts.join(', ');
  };

  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(v) => v && onValueChange(v as any)}
        className="justify-start flex-wrap"
      >
        <ToggleGroupItem 
          value="planned" 
          aria-label="Pianificato"
          className="gap-1.5 text-xs sm:text-sm sm:gap-2 px-2.5 sm:px-3"
        >
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span className="hidden xs:inline">Pianificato</span>
          <span className="xs:hidden">Plan.</span>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="expected" 
          aria-label="Previsti"
          className="gap-1.5 text-xs sm:text-sm sm:gap-2 px-2.5 sm:px-3"
        >
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span className="hidden xs:inline">Previsti</span>
          <span className="xs:hidden">Prev.</span>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="confirmed" 
          aria-label="Confermati"
          className="gap-1.5 text-xs sm:text-sm sm:gap-2 px-2.5 sm:px-3"
        >
          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span className="hidden xs:inline">Confermati</span>
          <span className="xs:hidden">Conf.</span>
        </ToggleGroupItem>
      </ToggleGroup>
      
      {!compact && plannedCounts && value === 'planned' && (
        <p className="text-xs text-muted-foreground">
          {formatBreakdown(plannedCounts.adults, plannedCounts.children, plannedCounts.staff)}
        </p>
      )}
      
      {!compact && value === 'expected' && expectedDetails && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">
            {expectedDetails.totalHeadCount ?? (expectedDetails.adults + expectedDetails.children + expectedDetails.staff + (expectedDetails.plusOnesConfirmed || 0) + (expectedDetails.plusOnesPotential || 0))} coperti previsti
          </span>
          <br />
          <span className="text-muted-foreground/80">
            {formatBreakdown(
              expectedDetails.adults, 
              expectedDetails.children, 
              expectedDetails.staff, 
              (expectedDetails.plusOnesConfirmed || 0) + (expectedDetails.plusOnesPotential || 0)
            )}
          </span>
          {(expectedDetails.plusOnesPotential ?? 0) > 0 && (expectedDetails.plusOnesConfirmed ?? 0) > 0 && (
            <span className="text-muted-foreground/60 ml-1">
              ({expectedDetails.plusOnesConfirmed} confermati)
            </span>
          )}
        </p>
      )}
      
      {!compact && value === 'expected' && !expectedDetails && breakdown && (
        <p className="text-xs text-muted-foreground">
          {breakdown.confirmed} confermati + {breakdown.pending} in attesa
          {breakdown.declined > 0 && ` (${breakdown.declined} rifiutati esclusi)`}
        </p>
      )}
      
      {!compact && breakdown && value === 'confirmed' && (
        <p className="text-xs text-muted-foreground">
          Solo invitati confermati ({breakdown.pending} in attesa esclusi)
        </p>
      )}
    </div>
  );
}