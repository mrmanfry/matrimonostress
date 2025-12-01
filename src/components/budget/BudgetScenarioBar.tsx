import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Baby, Briefcase, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BudgetScenarioBarProps {
  currentMode: 'planned' | 'expected' | 'confirmed';
  guestCounts: {
    planned: { adults: number; children: number; staff: number };
    expected: { adults: number; children: number; staff: number };
    confirmed: { adults: number; children: number; staff: number };
  };
}

export function BudgetScenarioBar({ currentMode, guestCounts }: BudgetScenarioBarProps) {
  const queryClient = useQueryClient();
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.weddingId : null;

  const isReadOnly = currentMode !== 'planned';
  
  // Use current mode's counts if read-only, otherwise local editable state
  const [counts, setCounts] = useState({
    adults: 100,
    children: 0,
    staff: 0,
  });

  // Fetch wedding targets
  const { data: wedding } = useQuery({
    queryKey: ["wedding-targets", weddingId],
    queryFn: async () => {
      if (!weddingId) return null;
      const { data, error } = await supabase
        .from("weddings")
        .select("target_adults, target_children, target_staff")
        .eq("id", weddingId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!weddingId,
  });

  // Initialize from DB (only for planned mode)
  useEffect(() => {
    if (wedding && currentMode === 'planned') {
      setCounts({
        adults: wedding.target_adults ?? 100,
        children: wedding.target_children ?? 0,
        staff: wedding.target_staff ?? 0,
      });
    }
  }, [wedding, currentMode]);

  // Update DB with debounced values
  const updateTargets = useMutation({
    mutationFn: async (newCounts: typeof counts) => {
      if (!weddingId) throw new Error("No wedding ID");
      
      const { error } = await supabase
        .from("weddings")
        .update({
          target_adults: newCounts.adults,
          target_children: newCounts.children,
          target_staff: newCounts.staff,
        })
        .eq("id", weddingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-spreadsheet"] });
      queryClient.invalidateQueries({ queryKey: ["wedding-targets"] });
      toast.success("Numeri target salvati");
    },
    onError: (error) => {
      toast.error("Errore aggiornamento target: " + error.message);
    },
  });

  // Debounced save effect with correct dependencies
  useEffect(() => {
    if (!wedding || !weddingId) return;
    
    const timer = setTimeout(() => {
      const hasChanged = 
        counts.adults !== (wedding.target_adults ?? 100) ||
        counts.children !== (wedding.target_children ?? 0) ||
        counts.staff !== (wedding.target_staff ?? 0);
      
      if (hasChanged) {
        updateTargets.mutate(counts);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [counts, wedding, weddingId]);

  const handleChange = (field: keyof typeof counts, value: string) => {
    if (isReadOnly) return; // Prevent changes when read-only
    const num = parseInt(value) || 0;
    setCounts({ ...counts, [field]: num });
  };

  // Get display values based on mode
  const displayCounts = isReadOnly ? guestCounts[currentMode] : counts;
  
  const getModeLabel = (type: 'adults' | 'children' | 'staff') => {
    if (currentMode === 'planned') {
      return type === 'adults' ? 'Adulti Target' : type === 'children' ? 'Bambini' : 'Staff';
    } else if (currentMode === 'expected') {
      return type === 'adults' ? 'Adulti Previsti' : type === 'children' ? 'Bambini Previsti' : 'Staff Previsti';
    } else {
      return type === 'adults' ? 'Adulti Confermati' : type === 'children' ? 'Bambini Confermati' : 'Staff Confermati';
    }
  };

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <div className="flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Label className="text-xs font-semibold text-foreground/70">
                {getModeLabel('adults')}
              </Label>
              {isReadOnly && <Lock className="w-3 h-3 text-muted-foreground" />}
            </div>
            <Input
              type="number"
              className={isReadOnly 
                ? "h-9 w-24 bg-muted/50 text-muted-foreground border-dashed cursor-not-allowed" 
                : "h-9 w-24 bg-background"}
              value={displayCounts.adults}
              onChange={(e) => handleChange("adults", e.target.value)}
              disabled={isReadOnly}
              min="0"
            />
            {isReadOnly && (
              <span className="text-xs text-muted-foreground mt-1 block">Dato da RSVP</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 rounded-full">
            <Baby className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Label className="text-xs font-semibold text-foreground/70">
                {getModeLabel('children')}
              </Label>
              {isReadOnly && <Lock className="w-3 h-3 text-muted-foreground" />}
            </div>
            <Input
              type="number"
              className={isReadOnly 
                ? "h-9 w-24 bg-muted/50 text-muted-foreground border-dashed cursor-not-allowed" 
                : "h-9 w-24 bg-background"}
              value={displayCounts.children}
              onChange={(e) => handleChange("children", e.target.value)}
              disabled={isReadOnly}
              min="0"
            />
            {isReadOnly && (
              <span className="text-xs text-muted-foreground mt-1 block">Dato da RSVP</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-full">
            <Briefcase className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Label className="text-xs font-semibold text-foreground/70">
                {getModeLabel('staff')}
              </Label>
              {isReadOnly && <Lock className="w-3 h-3 text-muted-foreground" />}
            </div>
            <Input
              type="number"
              className={isReadOnly 
                ? "h-9 w-24 bg-muted/50 text-muted-foreground border-dashed cursor-not-allowed" 
                : "h-9 w-24 bg-background"}
              value={displayCounts.staff}
              onChange={(e) => handleChange("staff", e.target.value)}
              disabled={isReadOnly}
              min="0"
            />
            {isReadOnly && (
              <span className="text-xs text-muted-foreground mt-1 block">Dato da RSVP</span>
            )}
          </div>
        </div>

        <div className="ml-auto text-sm text-muted-foreground italic">
          {isReadOnly 
            ? "Numeri da RSVP (non modificabili)"
            : "Le spese variabili si aggiornano automaticamente in base a questi numeri"}
        </div>
      </div>
    </Card>
  );
}
